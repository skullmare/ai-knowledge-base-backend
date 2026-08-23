const mongoose = require('mongoose');
const mocks = require('../helpers/mocks');
const { app, request, createAuthenticatedUser, authRequest } = require('../helpers/request');
const Topic = require('../../src/models/topic');
const Log = require('../../src/models/log');
const { createTopic, createTopicCategory, createAgentRole } = require('../helpers/factories');

const BASE = '/api/v1/topics';

const payload = async (overrides = {}) => ({
    name: `Тема ${Date.now()}`,
    metadata: {
        category: (await createTopicCategory())._id.toString(),
        accessibleByRoles: [(await createAgentRole())._id.toString()]
    },
    ...overrides
});

describe(`GET ${BASE}`, () => {
    it('возвращает список с пагинацией и раскрытыми связями', async () => {
        const { token } = await createAuthenticatedUser();
        await createTopic();

        const response = await authRequest(token).get(BASE);

        expect(response.status).toBe(200);
        expect(response.body.pagination).toMatchObject({ total: 1, current: 1, pages: 1 });
        expect(response.body.data[0].metadata.category).toHaveProperty('name');
        expect(response.body.data[0].createdBy).toHaveProperty('firstName');
    });

    it('не отдаёт содержимое темы в списке', async () => {
        const { token } = await createAuthenticatedUser();
        await createTopic();

        const response = await authRequest(token).get(BASE);

        expect(response.body.data[0]).not.toHaveProperty('markdownContent');
        expect(response.body.data[0]).not.toHaveProperty('collaborationData');
    });

    it('фильтрует по статусу, категории и роли', async () => {
        const { token } = await createAuthenticatedUser();
        const category = await createTopicCategory();
        const role = await createAgentRole();
        await createTopic({ category: category._id, roles: [role._id], status: 'approved' });
        await createTopic();

        const byStatus = await authRequest(token).get(`${BASE}?status=approved`);
        const byCategory = await authRequest(token).get(`${BASE}?category=${category._id}`);
        const byRole = await authRequest(token).get(`${BASE}?role=${role._id}`);

        expect(byStatus.body.data).toHaveLength(1);
        expect(byCategory.body.data).toHaveLength(1);
        expect(byRole.body.data).toHaveLength(1);
    });

    it('ищет по полнотекстовому индексу', async () => {
        const { token } = await createAuthenticatedUser();
        await Topic.syncIndexes();
        await createTopic({ name: 'Регламент отпусков' });
        await createTopic({ name: 'Порядок командировок' });

        const response = await authRequest(token).get(`${BASE}?search=отпусков`);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Регламент отпусков');
    });

    it('отклоняет некорректный статус фильтра', async () => {
        const { token } = await createAuthenticatedUser();

        expect((await authRequest(token).get(`${BASE}?status=unknown`)).status).toBe(400);
    });

    it('требует право topics.read', async () => {
        const { token } = await createAuthenticatedUser({ permissions: ['logs.read'] });

        expect((await authRequest(token).get(BASE)).status).toBe(403);
    });

    it('требует авторизации', async () => {
        expect((await request(app).get(BASE)).status).toBe(401);
    });
});

describe(`GET ${BASE}/:id`, () => {
    it('возвращает тему по идентификатору', async () => {
        const { token } = await createAuthenticatedUser();
        const topic = await createTopic();

        const response = await authRequest(token).get(`${BASE}/${topic._id}`);

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe(topic.name);
    });

    it('возвращает 400 для несуществующей темы', async () => {
        const { token } = await createAuthenticatedUser();

        expect((await authRequest(token).get(`${BASE}/${new mongoose.Types.ObjectId()}`)).status).toBe(400);
    });
});

describe(`POST ${BASE}`, () => {
    it('создаёт тему в статусе review', async () => {
        const { user, token } = await createAuthenticatedUser();

        const response = await authRequest(token).post(BASE).send(await payload());

        expect(response.status).toBe(201);
        expect(response.body.data.status).toBe('review');
        expect(response.body.data.createdBy._id).toBe(user._id.toString());
        expect(await Log.countDocuments({ action: 'TOPIC_CREATE' })).toBe(1);
    });

    it('требует существующую категорию', async () => {
        const { token } = await createAuthenticatedUser();
        const body = await payload();
        body.metadata.category = new mongoose.Types.ObjectId().toString();

        expect((await authRequest(token).post(BASE).send(body)).status).toBe(400);
    });

    it('требует хотя бы одну роль доступа', async () => {
        const { token } = await createAuthenticatedUser();
        const body = await payload();
        body.metadata.accessibleByRoles = [];

        expect((await authRequest(token).post(BASE).send(body)).status).toBe(400);
    });

    it('отклоняет несуществующую роль доступа', async () => {
        const { token } = await createAuthenticatedUser();
        const body = await payload();
        body.metadata.accessibleByRoles = [new mongoose.Types.ObjectId().toString()];

        expect((await authRequest(token).post(BASE).send(body)).status).toBe(400);
    });

    it('требует право topics.create', async () => {
        const { token } = await createAuthenticatedUser({ permissions: ['topics.read'] });

        expect((await authRequest(token).post(BASE).send(await payload())).status).toBe(403);
    });
});

describe(`PATCH ${BASE}/:id`, () => {
    it('переименовывает тему и возвращает её на проверку', async () => {
        const { user, token } = await createAuthenticatedUser();
        const topic = await createTopic({ status: 'approved' });

        const response = await authRequest(token)
            .patch(`${BASE}/${topic._id}`)
            .send({ name: 'Новое название' });

        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject({ name: 'Новое название', status: 'review' });
        expect(response.body.data.updatedBy._id).toBe(user._id.toString());
    });

    it('снимает признак индексации и чистит векторы', async () => {
        const { token } = await createAuthenticatedUser();
        const topic = await createTopic({ status: 'approved', vectorData: { isIndexed: true } });

        await authRequest(token).patch(`${BASE}/${topic._id}`).send({ name: 'Правка' });

        expect(mocks.qdrant.delete).toHaveBeenCalled();
        expect((await Topic.findById(topic._id)).vectorData.isIndexed).toBe(false);
    });

    it('архивирует тему', async () => {
        const { token } = await createAuthenticatedUser();
        const topic = await createTopic({ status: 'approved' });

        const response = await authRequest(token)
            .patch(`${BASE}/${topic._id}`)
            .send({ status: 'archived' });

        expect(response.body.data.status).toBe('archived');
    });

    it('обновляет категорию и роли доступа', async () => {
        const { token } = await createAuthenticatedUser();
        const topic = await createTopic();
        const category = await createTopicCategory();

        const response = await authRequest(token)
            .patch(`${BASE}/${topic._id}`)
            .send({ metadata: { category: category._id.toString() } });

        expect(response.status).toBe(200);
        expect(response.body.data.metadata.category._id).toBe(category._id.toString());
    });

    it('не принимает статус approved напрямую', async () => {
        const { token } = await createAuthenticatedUser();
        const topic = await createTopic();

        expect((await authRequest(token).patch(`${BASE}/${topic._id}`).send({ status: 'approved' })).status).toBe(400);
    });

    it('возвращает 400 для несуществующей темы', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .patch(`${BASE}/${new mongoose.Types.ObjectId()}`)
            .send({ name: 'Название' });

        expect(response.status).toBe(400);
    });
});

describe(`POST ${BASE}/:id/approve`, () => {
    it('одобряет тему и индексирует её', async () => {
        const { token } = await createAuthenticatedUser();
        const topic = await createTopic();

        const response = await authRequest(token).post(`${BASE}/${topic._id}/approve`);

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('approved');
        expect(response.body.data.vectorData.isIndexed).toBe(true);
        expect(mocks.qdrant.upsert).toHaveBeenCalled();
        expect(await Log.countDocuments({ action: 'TOPIC_APPROVE' })).toBe(1);
    });

    it('отклоняет повторное одобрение', async () => {
        const { token } = await createAuthenticatedUser();
        const topic = await createTopic({ status: 'approved' });

        const response = await authRequest(token).post(`${BASE}/${topic._id}/approve`);

        expect(response.status).toBe(409);
    });

    it('отклоняет одобрение пустой темы', async () => {
        const { token } = await createAuthenticatedUser();
        const topic = await createTopic({ markdownContent: '' });

        const response = await authRequest(token).post(`${BASE}/${topic._id}/approve`);

        expect(response.status).toBe(422);
        expect(mocks.qdrant.upsert).not.toHaveBeenCalled();
    });

    it('не меняет статус, если индексация упала', async () => {
        const { token } = await createAuthenticatedUser();
        const topic = await createTopic();
        mocks.qdrant.upsert.mockRejectedValueOnce(new Error('Qdrant недоступен'));

        const response = await authRequest(token).post(`${BASE}/${topic._id}/approve`);

        expect(response.status).toBe(500);
        expect((await Topic.findById(topic._id)).status).toBe('review');
    });

    it('требует право topics.approve', async () => {
        const { token } = await createAuthenticatedUser({ permissions: ['topics.read'] });
        const topic = await createTopic();

        expect((await authRequest(token).post(`${BASE}/${topic._id}/approve`)).status).toBe(403);
    });
});

describe(`DELETE ${BASE}/:id`, () => {
    it('удаляет тему и её векторы', async () => {
        const { token } = await createAuthenticatedUser();
        const topic = await createTopic();

        const response = await authRequest(token).delete(`${BASE}/${topic._id}`);

        expect(response.status).toBe(200);
        expect(await Topic.findById(topic._id)).toBeNull();
        expect(mocks.qdrant.delete).toHaveBeenCalled();
        expect(await Log.countDocuments({ action: 'TOPIC_DELETE' })).toBe(1);
    });

    it('не удаляет тему, если очистка векторов не удалась', async () => {
        const { token } = await createAuthenticatedUser();
        const topic = await createTopic();
        mocks.qdrant.delete.mockRejectedValueOnce(new Error('Qdrant недоступен'));

        const response = await authRequest(token).delete(`${BASE}/${topic._id}`);

        expect(response.status).toBe(500);
        expect(await Topic.findById(topic._id)).not.toBeNull();
        expect(await Log.countDocuments({ action: 'TOPIC_CLEANUP_ERROR' })).toBe(1);
    });

    it('требует право topics.delete', async () => {
        const { token } = await createAuthenticatedUser({ permissions: ['topics.read'] });
        const topic = await createTopic();

        expect((await authRequest(token).delete(`${BASE}/${topic._id}`)).status).toBe(403);
    });
});
