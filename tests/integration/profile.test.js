const mocks = require('../helpers/mocks');
const { app, request, createAuthenticatedUser, authRequest } = require('../helpers/request');
const PlatformUser = require('../../src/models/platform-user');
const Log = require('../../src/models/log');
const { createPlatformUser } = require('../helpers/factories');
const { buildPublicUrl } = require('../../src/services/yandex/S3/url');

describe('GET /api/v1/profile', () => {
    it('возвращает профиль с раскрытой ролью', async () => {
        const { user, role, token } = await createAuthenticatedUser();

        const response = await authRequest(token).get('/api/v1/profile');

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({ login: user.login, email: user.email });
        expect(response.body.data.role).toMatchObject({ name: role.name });
        expect(response.body.data.role.permissions).toEqual(expect.arrayContaining(['topics.read']));
    });

    it('никогда не отдаёт пароль и служебные поля', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token).get('/api/v1/profile');

        expect(response.body.data).not.toHaveProperty('password');
        expect(response.body.data).not.toHaveProperty('twoFactorCode');
        expect(response.body.data).not.toHaveProperty('resetPasswordToken');
    });

    it('требует авторизации', async () => {
        expect((await request(app).get('/api/v1/profile')).status).toBe(401);
    });
});

describe('PATCH /api/v1/profile/update', () => {
    it('обновляет личные данные', async () => {
        const { user, token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .patch('/api/v1/profile/update')
            .send({ firstName: 'Пётр', lastName: 'Петров' });

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({ firstName: 'Пётр', lastName: 'Петров' });

        const stored = await PlatformUser.findById(user._id);
        expect(stored.firstName).toBe('Пётр');
    });

    it('приводит логин и email к нижнему регистру', async () => {
        const { user, token } = await createAuthenticatedUser();

        await authRequest(token)
            .patch('/api/v1/profile/update')
            .send({ login: 'NewLogin', email: 'New.Mail@Example.COM' });

        const stored = await PlatformUser.findById(user._id);
        expect(stored.login).toBe('newlogin');
        expect(stored.email).toBe('new.mail@example.com');
    });

    it('запрещает занять чужой логин', async () => {
        const { user: other } = await createPlatformUser();
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .patch('/api/v1/profile/update')
            .send({ login: other.login });

        expect(response.status).toBe(400);
        expect(response.body.errors[0].path).toBe('login');
    });

    it('запрещает занять чужой email', async () => {
        const { user: other } = await createPlatformUser();
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .patch('/api/v1/profile/update')
            .send({ email: other.email });

        expect(response.status).toBe(400);
        expect(response.body.errors[0].path).toBe('email');
    });

    it('разрешает сохранить собственный логин без изменений', async () => {
        const { user, token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .patch('/api/v1/profile/update')
            .send({ login: user.login });

        expect(response.status).toBe(200);
    });

    it('сообщает, что изменений нет', async () => {
        const { user, token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .patch('/api/v1/profile/update')
            .send({ firstName: user.firstName });

        expect(response.status).toBe(200);
        expect(response.body.message).toMatch(/Изменений не обнаружено/);
    });

    it('удаляет прежний аватар из S3 при замене', async () => {
        const { token } = await createAuthenticatedUser({ photoUrl: buildPublicUrl('uploads/aa/bb/old.png') });

        const response = await authRequest(token)
            .patch('/api/v1/profile/update')
            .send({ photoUrl: buildPublicUrl('uploads/cc/dd/new.png') });

        expect(response.status).toBe(200);
        expect(mocks.s3Send).toHaveBeenCalledTimes(1);
    });

    it('не трогает S3, если аватара раньше не было', async () => {
        const { token } = await createAuthenticatedUser();

        await authRequest(token)
            .patch('/api/v1/profile/update')
            .send({ photoUrl: buildPublicUrl('uploads/cc/dd/new.png') });

        expect(mocks.s3Send).not.toHaveBeenCalled();
    });

    it('записывает изменение профиля в журнал', async () => {
        const { token } = await createAuthenticatedUser();

        await authRequest(token).patch('/api/v1/profile/update').send({ firstName: 'Пётр' });

        expect(await Log.countDocuments({ action: 'PROFILE_UPDATE' })).toBe(1);
    });

    it('валидирует формат email и длину имени', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .patch('/api/v1/profile/update')
            .send({ email: 'broken', firstName: '' });

        expect(response.status).toBe(400);
        expect(response.body.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('требует авторизации', async () => {
        expect((await request(app).patch('/api/v1/profile/update').send({})).status).toBe(401);
    });
});
