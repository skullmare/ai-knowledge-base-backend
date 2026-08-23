const crypto = require('crypto');
const mocks = require('../helpers/mocks');
const { app, request, createAuthenticatedUser, authRequest } = require('../helpers/request');
const PlatformUser = require('../../src/models/platform-user');
const Log = require('../../src/models/log');
const { comparePassword } = require('../../src/utils/password-handler');

const resetUrlToken = () => {
    const html = mocks.sendEmail.mock.calls.at(-1)[0].html;
    return html.match(/reset-password\/([a-f0-9]{64})/)[1];
};

describe('PUT /api/v1/password/change', () => {
    it('меняет пароль по верному текущему паролю', async () => {
        const { user, plainPassword, token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .put('/api/v1/password/change')
            .send({ oldPassword: plainPassword, newPassword: 'BrandNewPass1', confirmPassword: 'BrandNewPass1' });

        expect(response.status).toBe(200);

        const stored = await PlatformUser.findById(user._id).select('+password');
        await expect(comparePassword('BrandNewPass1', stored.password)).resolves.toBe(true);
    });

    it('пишет событие смены пароля в журнал', async () => {
        const { plainPassword, token } = await createAuthenticatedUser();

        await authRequest(token)
            .put('/api/v1/password/change')
            .send({ oldPassword: plainPassword, newPassword: 'BrandNewPass1', confirmPassword: 'BrandNewPass1' });

        expect(await Log.countDocuments({ action: 'PROFILE_PASSWORD_CHANGE' })).toBe(1);
    });

    it('отклоняет неверный текущий пароль', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .put('/api/v1/password/change')
            .send({ oldPassword: 'WrongPassword1', newPassword: 'BrandNewPass1', confirmPassword: 'BrandNewPass1' });

        expect(response.status).toBe(401);
        expect(response.body.errors[0].path).toBe('oldPassword');
    });

    it('требует совпадения нового пароля и подтверждения', async () => {
        const { plainPassword, token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .put('/api/v1/password/change')
            .send({ oldPassword: plainPassword, newPassword: 'BrandNewPass1', confirmPassword: 'Different1' });

        expect(response.status).toBe(400);
        expect(response.body.errors[0].path).toBe('confirmPassword');
    });

    it('запрещает новый пароль, равный старому', async () => {
        const { plainPassword, token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .put('/api/v1/password/change')
            .send({ oldPassword: plainPassword, newPassword: plainPassword, confirmPassword: plainPassword });

        expect(response.status).toBe(400);
    });

    it('требует минимальную длину нового пароля', async () => {
        const { plainPassword, token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .put('/api/v1/password/change')
            .send({ oldPassword: plainPassword, newPassword: 'short', confirmPassword: 'short' });

        expect(response.status).toBe(400);
        expect(response.body.errors[0].message).toMatch(/минимум 10 символов/);
    });

    it('требует авторизации', async () => {
        const response = await request(app).put('/api/v1/password/change').send({});

        expect(response.status).toBe(401);
    });
});

describe('POST /api/v1/password/forgot', () => {
    it('отправляет письмо со ссылкой восстановления', async () => {
        const { user } = await createAuthenticatedUser();

        const response = await request(app).post('/api/v1/password/forgot').send({ email: user.email });

        expect(response.status).toBe(200);
        expect(mocks.sendEmail).toHaveBeenCalledTimes(1);

        const stored = await PlatformUser.findById(user._id).select('+resetPasswordToken +resetPasswordExpires');
        expect(stored.resetPasswordToken).toBeTruthy();
        expect(stored.resetPasswordExpires.getTime()).toBeGreaterThan(Date.now());
    });

    it('хранит только хеш токена восстановления', async () => {
        const { user } = await createAuthenticatedUser();
        await request(app).post('/api/v1/password/forgot').send({ email: user.email });

        const stored = await PlatformUser.findById(user._id).select('+resetPasswordToken');
        const expected = crypto.createHash('sha256').update(resetUrlToken()).digest('hex');

        expect(stored.resetPasswordToken).toBe(expected);
    });

    it('одинаково отвечает на неизвестный email и не шлёт письмо', async () => {
        const { user } = await createAuthenticatedUser();

        const known = await request(app).post('/api/v1/password/forgot').send({ email: user.email });
        mocks.sendEmail.mockClear();
        const unknown = await request(app).post('/api/v1/password/forgot').send({ email: 'nobody@example.com' });

        expect(unknown.status).toBe(known.status);
        expect(unknown.body.message).toBe(known.body.message);
        expect(mocks.sendEmail).not.toHaveBeenCalled();
    });

    it('никогда не возвращает токен в ответе', async () => {
        const { user } = await createAuthenticatedUser();

        const response = await request(app).post('/api/v1/password/forgot').send({ email: user.email });

        expect(JSON.stringify(response.body)).not.toContain(resetUrlToken());
    });

    it('откатывает токен, если письмо не ушло', async () => {
        const { user } = await createAuthenticatedUser();
        mocks.sendEmail.mockRejectedValueOnce(new Error('SMTP недоступен'));

        const response = await request(app).post('/api/v1/password/forgot').send({ email: user.email });

        expect(response.status).toBe(500);

        const stored = await PlatformUser.findById(user._id).select('+resetPasswordToken');
        expect(stored.resetPasswordToken).toBeUndefined();
    });

    it('валидирует формат email', async () => {
        const response = await request(app).post('/api/v1/password/forgot').send({ email: 'not-an-email' });

        expect(response.status).toBe(400);
    });
});

describe('POST /api/v1/password/reset/:token', () => {
    const requestReset = async () => {
        const { user } = await createAuthenticatedUser();
        await request(app).post('/api/v1/password/forgot').send({ email: user.email });

        return { user, token: resetUrlToken() };
    };

    it('меняет пароль по валидному токену', async () => {
        const { user, token } = await requestReset();

        const response = await request(app)
            .post(`/api/v1/password/reset/${token}`)
            .send({ password: 'RestoredPass1', confirmPassword: 'RestoredPass1' });

        expect(response.status).toBe(200);

        const stored = await PlatformUser.findById(user._id).select('+password +resetPasswordToken');
        await expect(comparePassword('RestoredPass1', stored.password)).resolves.toBe(true);
        expect(stored.resetPasswordToken).toBeUndefined();
    });

    it('делает токен одноразовым', async () => {
        const { token } = await requestReset();
        await request(app).post(`/api/v1/password/reset/${token}`)
            .send({ password: 'RestoredPass1', confirmPassword: 'RestoredPass1' });

        const second = await request(app).post(`/api/v1/password/reset/${token}`)
            .send({ password: 'AnotherPass12', confirmPassword: 'AnotherPass12' });

        expect(second.status).toBe(400);
    });

    it('отклоняет просроченный токен', async () => {
        const { user, token } = await requestReset();
        await PlatformUser.findByIdAndUpdate(user._id, { resetPasswordExpires: new Date(Date.now() - 1000) });

        const response = await request(app)
            .post(`/api/v1/password/reset/${token}`)
            .send({ password: 'RestoredPass1', confirmPassword: 'RestoredPass1' });

        expect(response.status).toBe(400);
    });

    it('отклоняет несуществующий токен', async () => {
        const response = await request(app)
            .post(`/api/v1/password/reset/${'a'.repeat(64)}`)
            .send({ password: 'RestoredPass1', confirmPassword: 'RestoredPass1' });

        expect(response.status).toBe(400);
    });

    it('требует совпадения паролей', async () => {
        const { token } = await requestReset();

        const response = await request(app)
            .post(`/api/v1/password/reset/${token}`)
            .send({ password: 'RestoredPass1', confirmPassword: 'Different12' });

        expect(response.status).toBe(400);
        expect(response.body.errors[0].path).toBe('confirmPassword');
    });
});
