const mongoose = require('mongoose');
const { app, request, createAuthenticatedUser, authRequest } = require('../helpers/request');
const PlatformRole = require('../../src/models/platform-role');
const Log = require('../../src/models/log');
const { createPlatformRole, createPlatformUser } = require('../helpers/factories');

const BASE = '/api/v1/platform/roles';

describe(`GET ${BASE}`, () => {
    it('возвращает роли, отсортированные по названию', async () => {
        const { token } = await createAuthenticatedUser();
        await createPlatformRole({ name: 'Ямщик' });
        await createPlatformRole({ name: 'Аналитик' });

        const response = await authRequest(token).get(BASE);

        expect(response.status).toBe(200);
        const names = response.body.data.map(role => role.name);
        expect(names.indexOf('Аналитик')).toBeLessThan(names.indexOf('Ямщик'));
    });

    it('фильтрует системные роли', async () => {
        const { token } = await createAuthenticatedUser();
        await createPlatformRole({ isSystem: true });

        const response = await authRequest(token).get(`${BASE}?isSystem=true`);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].isSystem).toBe(true);
    });

    it('ищет по названию без интерпретации спецсимволов', async () => {
        const { token } = await createAuthenticatedUser();
        await createPlatformRole({ name: 'Роль (основная)' });

        const found = await authRequest(token).get(`${BASE}?search=${encodeURIComponent('(основная)')}`);
        const wildcard = await authRequest(token).get(`${BASE}?search=${encodeURIComponent('.*')}`);

        expect(found.body.data).toHaveLength(1);
        expect(wildcard.body.data).toHaveLength(0);
    });

    it('требует право platformRoles.read', async () => {
        const { token } = await createAuthenticatedUser({ permissions: ['topics.read'] });

        expect((await authRequest(token).get(BASE)).status).toBe(403);
    });
});

describe(`GET ${BASE}/:id`, () => {
    it('возвращает роль по идентификатору', async () => {
        const { token } = await createAuthenticatedUser();
        const role = await createPlatformRole();

        const response = await authRequest(token).get(`${BASE}/${role._id}`);

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe(role.name);
    });

    it('возвращает 404 для несуществующей роли', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token).get(`${BASE}/${new mongoose.Types.ObjectId()}`);

        expect(response.status).toBe(404);
    });
});

describe(`POST ${BASE}`, () => {
    const payload = (overrides = {}) => ({
        name: `Роль ${Date.now()}`,
        description: 'Описание роли',
        permissions: ['topics.read'],
        ...overrides
    });

    it('создаёт роль', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token).post(BASE).send(payload());

        expect(response.status).toBe(201);
        expect(response.body.data.permissions).toEqual(['topics.read']);
        expect(await Log.countDocuments({ action: 'PLATFORM_ROLE_CREATE' })).toBe(1);
    });

    it('запрещает пустой список прав', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token).post(BASE).send(payload({ permissions: [] }));

        expect(response.status).toBe(400);
    });

    it('запрещает неизвестное право', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token).post(BASE).send(payload({ permissions: ['topics.hack'] }));

        expect(response.status).toBe(400);
    });

    it('запрещает дублирующее название', async () => {
        const { token } = await createAuthenticatedUser();
        const existing = await createPlatformRole();

        const response = await authRequest(token).post(BASE).send(payload({ name: existing.name }));

        expect(response.status).toBe(400);
        expect(response.body.errors[0].path).toBe('name');
    });
});

describe(`PATCH ${BASE}/:id`, () => {
    it('обновляет права роли', async () => {
        const { token } = await createAuthenticatedUser();
        const role = await createPlatformRole({ permissions: ['topics.read'] });

        const response = await authRequest(token)
            .patch(`${BASE}/${role._id}`)
            .send({ permissions: ['topics.read', 'topics.create'] });

        expect(response.status).toBe(200);
        expect(response.body.data.permissions).toHaveLength(2);
    });

    it('запрещает менять права системной роли', async () => {
        const { token } = await createAuthenticatedUser();
        const role = await createPlatformRole({ isSystem: true });

        const response = await authRequest(token)
            .patch(`${BASE}/${role._id}`)
            .send({ permissions: ['topics.read'] });

        expect(response.status).toBe(400);
    });

    it('возвращает 400 для несуществующей роли', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .patch(`${BASE}/${new mongoose.Types.ObjectId()}`)
            .send({ description: 'Новое описание' });

        expect(response.status).toBe(400);
    });
});

describe(`DELETE ${BASE}/:id`, () => {
    it('удаляет свободную роль', async () => {
        const { token } = await createAuthenticatedUser();
        const role = await createPlatformRole();

        const response = await authRequest(token).delete(`${BASE}/${role._id}`);

        expect(response.status).toBe(200);
        expect(await PlatformRole.findById(role._id)).toBeNull();
    });

    it('запрещает удаление системной роли', async () => {
        const { token } = await createAuthenticatedUser();
        const role = await createPlatformRole({ isSystem: true });

        expect((await authRequest(token).delete(`${BASE}/${role._id}`)).status).toBe(400);
    });

    it('запрещает удаление роли, назначенной пользователю', async () => {
        const { token } = await createAuthenticatedUser();
        const role = await createPlatformRole();
        await createPlatformUser({ role: role._id });

        const response = await authRequest(token).delete(`${BASE}/${role._id}`);

        expect(response.status).toBe(400);
        expect(response.body.errors[0].message).toMatch(/назначена пользователям/);
    });
});

describe(`DELETE ${BASE}/delete/many`, () => {
    it('удаляет несколько свободных ролей', async () => {
        const { token } = await createAuthenticatedUser();
        const roles = await Promise.all([createPlatformRole(), createPlatformRole()]);

        const response = await authRequest(token)
            .delete(`${BASE}/delete/many`)
            .send({ ids: roles.map(role => role._id.toString()) });

        expect(response.status).toBe(200);
        expect(response.body.data.count).toBe(2);
    });

    it('отклоняет пакет, если хотя бы одна роль системная', async () => {
        const { token } = await createAuthenticatedUser();
        const free = await createPlatformRole();
        const system = await createPlatformRole({ isSystem: true });

        const response = await authRequest(token)
            .delete(`${BASE}/delete/many`)
            .send({ ids: [free._id.toString(), system._id.toString()] });

        expect(response.status).toBe(400);
        expect(await PlatformRole.countDocuments({ _id: free._id })).toBe(1);
    });

    it('отклоняет пустой список', async () => {
        const { token } = await createAuthenticatedUser();

        expect((await authRequest(token).delete(`${BASE}/delete/many`).send({ ids: [] })).status).toBe(400);
    });
});

describe('Маршрут ролей без авторизации', () => {
    it('возвращает 401', async () => {
        expect((await request(app).get(BASE)).status).toBe(401);
    });
});
