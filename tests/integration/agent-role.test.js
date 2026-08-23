const mongoose = require('mongoose');
const { app, request, createAuthenticatedUser, authRequest } = require('../helpers/request');
const AgentRole = require('../../src/models/agent-role');
const { createAgentRole, createAgentUser, createTopic } = require('../helpers/factories');

const BASE = '/api/v1/agent/roles';

describe(`GET ${BASE}`, () => {
    it('возвращает список ролей агента', async () => {
        const { token } = await createAuthenticatedUser();
        await Promise.all([createAgentRole(), createAgentRole()]);

        const response = await authRequest(token).get(BASE);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(2);
    });

    it('ищет по названию и описанию', async () => {
        const { token } = await createAuthenticatedUser();
        await createAgentRole({ name: 'Партнёр', description: 'Внешний контрагент' });
        await createAgentRole({ name: 'Сотрудник', description: 'Внутренний пользователь' });

        const byName = await authRequest(token).get(`${BASE}?search=Партн`);
        const byDescription = await authRequest(token).get(`${BASE}?search=Внутренний`);

        expect(byName.body.data).toHaveLength(1);
        expect(byDescription.body.data[0].name).toBe('Сотрудник');
    });

    it('требует право agentRoles.read', async () => {
        const { token } = await createAuthenticatedUser({ permissions: ['topics.read'] });

        expect((await authRequest(token).get(BASE)).status).toBe(403);
    });

    it('требует авторизации', async () => {
        expect((await request(app).get(BASE)).status).toBe(401);
    });
});

describe(`GET ${BASE}/:id`, () => {
    it('возвращает роль по идентификатору', async () => {
        const { token } = await createAuthenticatedUser();
        const role = await createAgentRole();

        const response = await authRequest(token).get(`${BASE}/${role._id}`);

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe(role.name);
    });

    it('возвращает 404 для несуществующей роли', async () => {
        const { token } = await createAuthenticatedUser();

        expect((await authRequest(token).get(`${BASE}/${new mongoose.Types.ObjectId()}`)).status).toBe(404);
    });
});

describe(`POST ${BASE}`, () => {
    it('создаёт роль агента', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .post(BASE)
            .send({ name: 'Застройщик', description: 'Доступ к темам застройщика' });

        expect(response.status).toBe(201);
        expect(await AgentRole.countDocuments()).toBe(1);
    });

    it('запрещает дублирующее название', async () => {
        const { token } = await createAuthenticatedUser();
        const existing = await createAgentRole();

        const response = await authRequest(token)
            .post(BASE)
            .send({ name: existing.name, description: 'Описание' });

        expect(response.status).toBe(400);
        expect(response.body.errors[0].path).toBe('name');
    });

    it('требует название и описание', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token).post(BASE).send({});

        expect(response.status).toBe(400);
        expect(response.body.errors).toHaveLength(2);
    });
});

describe(`PATCH ${BASE}/:id`, () => {
    it('обновляет описание роли', async () => {
        const { token } = await createAuthenticatedUser();
        const role = await createAgentRole();

        const response = await authRequest(token)
            .patch(`${BASE}/${role._id}`)
            .send({ description: 'Новое описание' });

        expect(response.status).toBe(200);
        expect(response.body.data.description).toBe('Новое описание');
    });

    it('возвращает 400 для несуществующей роли', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .patch(`${BASE}/${new mongoose.Types.ObjectId()}`)
            .send({ description: 'Описание' });

        expect(response.status).toBe(400);
    });
});

describe(`DELETE ${BASE}/:id`, () => {
    it('удаляет свободную роль', async () => {
        const { token } = await createAuthenticatedUser();
        const role = await createAgentRole();

        const response = await authRequest(token).delete(`${BASE}/${role._id}`);

        expect(response.status).toBe(200);
        expect(await AgentRole.findById(role._id)).toBeNull();
    });

    it('запрещает удаление роли, назначенной теме', async () => {
        const { token } = await createAuthenticatedUser();
        const role = await createAgentRole();
        await createTopic({ roles: [role._id] });

        const response = await authRequest(token).delete(`${BASE}/${role._id}`);

        expect(response.status).toBe(400);
        expect(response.body.errors[0].message).toMatch(/назначена темам/);
        expect(await AgentRole.findById(role._id)).not.toBeNull();
    });

    it('запрещает удаление роли, назначенной пользователю агента', async () => {
        const { token } = await createAuthenticatedUser();
        const role = await createAgentRole();
        await createAgentUser({ role: role._id });

        const response = await authRequest(token).delete(`${BASE}/${role._id}`);

        expect(response.status).toBe(400);
        expect(response.body.errors[0].message).toMatch(/пользователям агента/);
    });
});

describe(`DELETE ${BASE}/delete/many`, () => {
    it('удаляет несколько свободных ролей', async () => {
        const { token } = await createAuthenticatedUser();
        const roles = await Promise.all([createAgentRole(), createAgentRole()]);

        const response = await authRequest(token)
            .delete(`${BASE}/delete/many`)
            .send({ ids: roles.map(role => role._id.toString()) });

        expect(response.status).toBe(200);
        expect(response.body.data.deletedCount).toBe(2);
    });

    it('отклоняет пакет, если роль используется темой', async () => {
        const { token } = await createAuthenticatedUser();
        const used = await createAgentRole();
        const free = await createAgentRole();
        await createTopic({ roles: [used._id] });

        const response = await authRequest(token)
            .delete(`${BASE}/delete/many`)
            .send({ ids: [used._id.toString(), free._id.toString()] });

        expect(response.status).toBe(400);
        expect(await AgentRole.countDocuments()).toBe(2);
    });

    it('отклоняет несуществующие идентификаторы', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .delete(`${BASE}/delete/many`)
            .send({ ids: [new mongoose.Types.ObjectId().toString()] });

        expect(response.status).toBe(400);
    });
});
