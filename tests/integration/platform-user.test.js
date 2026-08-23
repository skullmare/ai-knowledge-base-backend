const mongoose = require('mongoose');
const mocks = require('../helpers/mocks');
const { app, request, createAuthenticatedUser, authRequest } = require('../helpers/request');
const PlatformUser = require('../../src/models/platform-user');
const Log = require('../../src/models/log');
const { createPlatformRole, createPlatformUser } = require('../helpers/factories');

const validPayload = async (overrides = {}) => ({
    firstName: 'Новый',
    lastName: 'Сотрудник',
    login: `employee-${Date.now()}`,
    email: `employee-${Date.now()}@example.com`,
    role: (await createPlatformRole())._id.toString(),
    ...overrides
});

describe('GET /api/v1/users', () => {
    it('возвращает список с пагинацией', async () => {
        const { token } = await createAuthenticatedUser();
        await Promise.all([createPlatformUser(), createPlatformUser()]);

        const response = await authRequest(token).get('/api/v1/users?page=1&limit=2');

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.pagination).toMatchObject({ total: 3, current: 1, limit: 2, pages: 2 });
    });

    it('фильтрует по статусу', async () => {
        const { token } = await createAuthenticatedUser();
        await createPlatformUser({ status: 'blocked' });

        const response = await authRequest(token).get('/api/v1/users?status=blocked');

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].status).toBe('blocked');
    });

    it('фильтрует по роли', async () => {
        const { token } = await createAuthenticatedUser();
        const role = await createPlatformRole();
        await createPlatformUser({ role: role._id });

        const response = await authRequest(token).get(`/api/v1/users?role=${role._id}`);

        expect(response.body.data).toHaveLength(1);
    });

    it('ищет по имени, фамилии, логину и email', async () => {
        const { token } = await createAuthenticatedUser();
        await createPlatformUser({ firstName: 'Уникальное' });

        const response = await authRequest(token).get('/api/v1/users?search=Уникальное');

        expect(response.body.data).toHaveLength(1);
    });

    it('трактует спецсимволы поиска как текст', async () => {
        const { token } = await createAuthenticatedUser();
        await createPlatformUser({ firstName: 'Ivan+Petrov' });

        const exact = await authRequest(token).get('/api/v1/users?search=Ivan%2BPetrov');
        const wildcard = await authRequest(token).get('/api/v1/users?search=.%2A');

        expect(exact.body.data).toHaveLength(1);
        expect(wildcard.body.data).toHaveLength(0);
    });

    it('не отдаёт пароли в списке', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token).get('/api/v1/users');

        response.body.data.forEach(user => expect(user).not.toHaveProperty('password'));
    });

    it('требует право platformUsers.read', async () => {
        const { token } = await createAuthenticatedUser({ permissions: ['topics.read'] });

        expect((await authRequest(token).get('/api/v1/users')).status).toBe(403);
    });

    it('требует авторизации', async () => {
        expect((await request(app).get('/api/v1/users')).status).toBe(401);
    });
});

describe('GET /api/v1/users/:id', () => {
    it('возвращает пользователя с правами роли', async () => {
        const { token } = await createAuthenticatedUser();
        const { user } = await createPlatformUser();

        const response = await authRequest(token).get(`/api/v1/users/${user._id}`);

        expect(response.status).toBe(200);
        expect(response.body.data.login).toBe(user.login);
        expect(response.body.data.role.permissions).toBeDefined();
    });

    it('возвращает 400 на несуществующем идентификаторе', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token).get(`/api/v1/users/${new mongoose.Types.ObjectId()}`);

        expect(response.status).toBe(400);
    });

    it('возвращает 400 на некорректном идентификаторе', async () => {
        const { token } = await createAuthenticatedUser();

        expect((await authRequest(token).get('/api/v1/users/not-an-id')).status).toBe(400);
    });
});

describe('POST /api/v1/users', () => {
    it('создаёт сотрудника и отправляет письмо с доступом', async () => {
        const { token } = await createAuthenticatedUser();
        const payload = await validPayload();

        const response = await authRequest(token).post('/api/v1/users').send(payload);

        expect(response.status).toBe(201);
        expect(response.body.data.login).toBe(payload.login);
        expect(response.body.data).not.toHaveProperty('password');
        expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('сохраняет пароль только в виде хеша', async () => {
        const { token } = await createAuthenticatedUser();
        const payload = await validPayload();
        await authRequest(token).post('/api/v1/users').send(payload);

        const stored = await PlatformUser.findOne({ login: payload.login }).select('+password');
        expect(stored.password).toMatch(/^\$2[aby]\$/);
    });

    it('создаёт сотрудника даже если письмо не ушло', async () => {
        const { token } = await createAuthenticatedUser();
        mocks.sendEmail.mockRejectedValueOnce(new Error('SMTP недоступен'));

        const response = await authRequest(token).post('/api/v1/users').send(await validPayload());

        expect(response.status).toBe(201);
    });

    it('запрещает дублирующий логин', async () => {
        const { token } = await createAuthenticatedUser();
        const { user } = await createPlatformUser();

        const response = await authRequest(token)
            .post('/api/v1/users')
            .send(await validPayload({ login: user.login }));

        expect(response.status).toBe(400);
        expect(response.body.errors[0].path).toBe('login');
    });

    it('запрещает дублирующий email', async () => {
        const { token } = await createAuthenticatedUser();
        const { user } = await createPlatformUser();

        const response = await authRequest(token)
            .post('/api/v1/users')
            .send(await validPayload({ email: user.email }));

        expect(response.status).toBe(400);
        expect(response.body.errors[0].path).toBe('email');
    });

    it('требует существующую роль', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .post('/api/v1/users')
            .send(await validPayload({ role: new mongoose.Types.ObjectId().toString() }));

        expect(response.status).toBe(400);
    });

    it('валидирует обязательные поля', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token).post('/api/v1/users').send({});

        expect(response.status).toBe(400);
        expect(response.body.errors.length).toBeGreaterThanOrEqual(4);
    });

    it('пишет создание в журнал', async () => {
        const { token } = await createAuthenticatedUser();
        await authRequest(token).post('/api/v1/users').send(await validPayload());

        expect(await Log.countDocuments({ action: 'PLATFORM_USER_CREATE' })).toBe(1);
    });

    it('требует право platformUsers.create', async () => {
        const { token } = await createAuthenticatedUser({ permissions: ['platformUsers.read'] });

        const response = await authRequest(token).post('/api/v1/users').send(await validPayload());

        expect(response.status).toBe(403);
    });
});

describe('PATCH /api/v1/users/:id', () => {
    it('обновляет данные сотрудника', async () => {
        const { token } = await createAuthenticatedUser();
        const { user } = await createPlatformUser();

        const response = await authRequest(token)
            .patch(`/api/v1/users/${user._id}`)
            .send({ firstName: 'Изменённое', status: 'blocked' });

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({ firstName: 'Изменённое', status: 'blocked' });
    });

    it('запрещает менять роль системного пользователя', async () => {
        const { token } = await createAuthenticatedUser();
        const { user } = await createPlatformUser({ isSystem: true });
        const role = await createPlatformRole();

        const response = await authRequest(token)
            .patch(`/api/v1/users/${user._id}`)
            .send({ role: role._id.toString() });

        expect(response.status).toBe(400);
        expect(response.body.errors[0].path).toBe('role');
    });

    it('запрещает блокировать системного пользователя', async () => {
        const { token } = await createAuthenticatedUser();
        const { user } = await createPlatformUser({ isSystem: true });

        const response = await authRequest(token)
            .patch(`/api/v1/users/${user._id}`)
            .send({ status: 'blocked' });

        expect(response.status).toBe(400);
    });

    it('запрещает занять чужой логин', async () => {
        const { token } = await createAuthenticatedUser();
        const [{ user: first }, { user: second }] = await Promise.all([createPlatformUser(), createPlatformUser()]);

        const response = await authRequest(token)
            .patch(`/api/v1/users/${first._id}`)
            .send({ login: second.login });

        expect(response.status).toBe(400);
    });

    it('возвращает 400 для несуществующего пользователя', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .patch(`/api/v1/users/${new mongoose.Types.ObjectId()}`)
            .send({ firstName: 'Имя' });

        expect(response.status).toBe(400);
    });
});

describe('DELETE /api/v1/users/:id', () => {
    it('удаляет сотрудника', async () => {
        const { token } = await createAuthenticatedUser();
        const { user } = await createPlatformUser();

        const response = await authRequest(token).delete(`/api/v1/users/${user._id}`);

        expect(response.status).toBe(200);
        expect(await PlatformUser.findById(user._id)).toBeNull();
        expect(await Log.countDocuments({ action: 'PLATFORM_USER_DELETE' })).toBe(1);
    });

    it('запрещает удаление системного пользователя', async () => {
        const { token } = await createAuthenticatedUser();
        const { user } = await createPlatformUser({ isSystem: true });

        const response = await authRequest(token).delete(`/api/v1/users/${user._id}`);

        expect(response.status).toBe(400);
        expect(await PlatformUser.findById(user._id)).not.toBeNull();
    });

    it('требует право platformUsers.delete', async () => {
        const { token } = await createAuthenticatedUser({ permissions: ['platformUsers.read'] });
        const { user } = await createPlatformUser();

        expect((await authRequest(token).delete(`/api/v1/users/${user._id}`)).status).toBe(403);
    });
});
