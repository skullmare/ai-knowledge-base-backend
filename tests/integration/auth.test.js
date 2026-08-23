const mocks = require('../helpers/mocks');
const { app, request } = require('../helpers/request');
const authService = require('../../src/services/auth');
const PlatformUser = require('../../src/models/platform-user');
const Log = require('../../src/models/log');
const { hashPassword } = require('../../src/utils/password-handler');
const { createPlatformUser } = require('../helpers/factories');

// В шаблоне письма есть hex-цвета, поэтому код берём строго из текстового узла.
const codeFromEmail = () => mocks.sendEmail.mock.calls.at(-1)[0].html.match(/>(\d{6})</)[1];

const loginWithCode = async () => {
    const { user, plainPassword } = await createPlatformUser();
    await request(app).post('/api/v1/auth/login').send({ login: user.login, password: plainPassword });

    return { user, plainPassword, code: codeFromEmail() };
};

describe('POST /api/v1/auth/login', () => {
    it('отправляет код подтверждения по верным учётным данным', async () => {
        const { user, plainPassword } = await createPlatformUser();

        const response = await request(app)
            .post('/api/v1/auth/login')
            .send({ login: user.login, password: plainPassword });

        expect(response.status).toBe(200);
        expect(response.body.message).toMatch(/Код подтверждения отправлен/);
        expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('не возвращает access-токен до подтверждения кода', async () => {
        const { user, plainPassword } = await createPlatformUser();

        const response = await request(app)
            .post('/api/v1/auth/login')
            .send({ login: user.login, password: plainPassword });

        expect(response.body.data).toBeNull();
        expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('хранит код только в виде хеша', async () => {
        const { user, plainPassword } = await createPlatformUser();
        await request(app).post('/api/v1/auth/login').send({ login: user.login, password: plainPassword });

        const stored = await PlatformUser.findById(user._id).select('+twoFactorCode');
        expect(stored.twoFactorCode).not.toBe(codeFromEmail());
        expect(stored.twoFactorCode).toMatch(/^\$2[aby]\$/);
    });

    it('не различает неверный пароль и несуществующий логин', async () => {
        const { user } = await createPlatformUser();

        const [wrongPassword, unknownLogin] = await Promise.all([
            request(app).post('/api/v1/auth/login').send({ login: user.login, password: 'WrongPassword1' }),
            request(app).post('/api/v1/auth/login').send({ login: 'nobody', password: 'WrongPassword1' })
        ]);

        expect(wrongPassword.status).toBe(401);
        expect(unknownLogin.status).toBe(401);
        expect(wrongPassword.body.message).toBe(unknownLogin.body.message);
        expect(mocks.sendEmail).not.toHaveBeenCalled();
    });

    it('логирует неудачную попытку входа', async () => {
        await request(app).post('/api/v1/auth/login').send({ login: 'nobody', password: 'WrongPassword1' });

        expect(await Log.countDocuments({ action: 'AUTH_LOGIN_FAILED' })).toBe(1);
    });

    it('запрещает вход заблокированному пользователю', async () => {
        const { user, plainPassword } = await createPlatformUser({ status: 'blocked' });

        const response = await request(app)
            .post('/api/v1/auth/login')
            .send({ login: user.login, password: plainPassword });

        expect(response.status).toBe(403);
        expect(mocks.sendEmail).not.toHaveBeenCalled();
    });

    it('валидирует тело запроса', async () => {
        const response = await request(app).post('/api/v1/auth/login').send({});

        expect(response.status).toBe(400);
        expect(response.body.errors.map(error => error.path).sort()).toEqual(['login', 'password']);
    });

    it('не присылает второй код, пока действует предыдущий', async () => {
        const { user, plainPassword } = await createPlatformUser();
        await request(app).post('/api/v1/auth/login').send({ login: user.login, password: plainPassword });

        const response = await request(app)
            .post('/api/v1/auth/login')
            .send({ login: user.login, password: plainPassword });

        expect(response.body.message).toMatch(/уже отправлен/);
        expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('находит пользователя независимо от регистра логина', async () => {
        const { user, plainPassword } = await createPlatformUser();

        const response = await request(app)
            .post('/api/v1/auth/login')
            .send({ login: user.login.toUpperCase(), password: plainPassword });

        expect(response.status).toBe(200);
    });
});

describe('POST /api/v1/auth/verify-2fa', () => {
    it('выдаёт access-токен и refresh-куку по верному коду', async () => {
        const { user, code } = await loginWithCode();

        const response = await request(app)
            .post('/api/v1/auth/verify-2fa')
            .send({ login: user.login, code });

        expect(response.status).toBe(200);
        expect(authService.validateAccessToken(response.body.data.accessToken)).toMatchObject({
            id: user._id.toString()
        });
        expect(response.headers['set-cookie'].join()).toMatch(/refreshToken=.*HttpOnly/i);
    });

    it('очищает код после успешного входа', async () => {
        const { user, code } = await loginWithCode();
        await request(app).post('/api/v1/auth/verify-2fa').send({ login: user.login, code });

        const stored = await PlatformUser.findById(user._id).select('+twoFactorCode +twoFactorAttempts');
        expect(stored.twoFactorCode).toBeNull();
        expect(stored.twoFactorAttempts).toBe(0);
        expect(stored.lastLogin).toBeInstanceOf(Date);
    });

    it('считает неудачные попытки и блокирует после третьей', async () => {
        const { user } = await loginWithCode();

        for (let attempt = 1; attempt <= 3; attempt += 1) {
            const response = await request(app)
                .post('/api/v1/auth/verify-2fa')
                .send({ login: user.login, code: '000000' });

            expect(response.status).toBe(401);
        }

        const response = await request(app)
            .post('/api/v1/auth/verify-2fa')
            .send({ login: user.login, code: '000000' });

        expect(response.status).toBe(429);
    });

    it('отклоняет истёкший код', async () => {
        const { user, code } = await loginWithCode();
        await PlatformUser.findByIdAndUpdate(user._id, {
            twoFactorCodeSentAt: new Date(Date.now() - 16 * 60 * 1000)
        });

        const response = await request(app)
            .post('/api/v1/auth/verify-2fa')
            .send({ login: user.login, code });

        expect(response.status).toBe(401);
        expect(response.body.message).toMatch(/истёк/);
    });

    it('отклоняет код, который не запрашивали', async () => {
        const { user } = await createPlatformUser();

        const response = await request(app)
            .post('/api/v1/auth/verify-2fa')
            .send({ login: user.login, code: '123456' });

        expect(response.status).toBe(401);
    });

    it('одинаково отвечает на несуществующий логин', async () => {
        const response = await request(app)
            .post('/api/v1/auth/verify-2fa')
            .send({ login: 'nobody', code: '123456' });

        expect(response.status).toBe(401);
        expect(response.body.message).toMatch(/не запрашивался/);
    });

    it('валидирует формат кода', async () => {
        const response = await request(app)
            .post('/api/v1/auth/verify-2fa')
            .send({ login: 'someone', code: '12ab' });

        expect(response.status).toBe(400);
        expect(response.body.errors[0].path).toBe('code');
    });
});

describe('POST /api/v1/auth/refresh', () => {
    const refreshCookie = (user) =>
        `refreshToken=${authService.generateTokens({ id: user._id.toString(), role: user.role }).refreshToken}`;

    it('обновляет пару токенов по валидной куке', async () => {
        const { user } = await createPlatformUser();

        const response = await request(app)
            .post('/api/v1/auth/refresh')
            .set('Cookie', refreshCookie(user));

        expect(response.status).toBe(200);
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.headers['set-cookie'].join()).toMatch(/refreshToken=/);
    });

    it('отклоняет запрос без куки', async () => {
        const response = await request(app).post('/api/v1/auth/refresh');

        expect(response.status).toBe(401);
    });

    it('отклоняет невалидную куку и логирует событие', async () => {
        const response = await request(app)
            .post('/api/v1/auth/refresh')
            .set('Cookie', 'refreshToken=broken');

        expect(response.status).toBe(401);
        expect(await Log.countDocuments({ action: 'AUTH_REFRESH_INVALID' })).toBe(1);
    });

    it('не продлевает сессию заблокированному пользователю', async () => {
        const { user } = await createPlatformUser({ status: 'blocked' });

        const response = await request(app)
            .post('/api/v1/auth/refresh')
            .set('Cookie', refreshCookie(user));

        expect(response.status).toBe(401);
    });

    it('не продлевает сессию удалённому пользователю', async () => {
        const { user } = await createPlatformUser();
        const cookie = refreshCookie(user);
        await PlatformUser.findByIdAndDelete(user._id);

        const response = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);

        expect(response.status).toBe(401);
    });

    it('не принимает access-токен вместо refresh-токена', async () => {
        const { user } = await createPlatformUser();
        const { accessToken } = authService.generateTokens({ id: user._id.toString(), role: user.role });

        const response = await request(app)
            .post('/api/v1/auth/refresh')
            .set('Cookie', `refreshToken=${accessToken}`);

        expect(response.status).toBe(401);
    });
});

describe('POST /api/v1/auth/logout', () => {
    it('сбрасывает refresh-куку', async () => {
        const response = await request(app).post('/api/v1/auth/logout');

        expect(response.status).toBe(200);
        expect(response.headers['set-cookie'].join()).toMatch(/refreshToken=;/);
    });
});

describe('Полный сценарий входа', () => {
    it('логин → код → токен → доступ к защищённому маршруту', async () => {
        const password = 'StrongPassword123';
        const { user } = await createPlatformUser({ password });

        await request(app).post('/api/v1/auth/login').send({ login: user.login, password });

        const verify = await request(app)
            .post('/api/v1/auth/verify-2fa')
            .send({ login: user.login, code: codeFromEmail() });

        const profile = await request(app)
            .get('/api/v1/profile')
            .set('Authorization', `Bearer ${verify.body.data.accessToken}`);

        expect(profile.status).toBe(200);
        expect(profile.body.data.login).toBe(user.login);
    });

    it('после смены пароля вход по старому паролю невозможен', async () => {
        const { user } = await createPlatformUser({ password: 'OldPassword123' });
        await PlatformUser.findByIdAndUpdate(user._id, { password: await hashPassword('NewPassword123') });

        const response = await request(app)
            .post('/api/v1/auth/login')
            .send({ login: user.login, password: 'OldPassword123' });

        expect(response.status).toBe(401);
    });
});
