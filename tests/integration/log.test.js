const mongoose = require('mongoose');
const { app, request, createAuthenticatedUser, authRequest } = require('../helpers/request');
const { createLog, createPlatformUser } = require('../helpers/factories');

const BASE = '/api/v1/logs';

describe(`GET ${BASE}`, () => {
    it('возвращает журнал с пагинацией, сначала свежие записи', async () => {
        const { token } = await createAuthenticatedUser();
        await createLog({ message: 'Первая запись' });
        await createLog({ message: 'Вторая запись' });

        const response = await authRequest(token).get(`${BASE}?limit=1`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].message).toBe('Вторая запись');
        expect(response.body.pagination).toMatchObject({ total: 2, pages: 2, limit: 1 });
    });

    it('добавляет человекочитаемые названия события и группы', async () => {
        const { token } = await createAuthenticatedUser();
        await createLog({ action: 'TOPIC_CREATE' });

        const response = await authRequest(token).get(BASE);

        expect(response.body.data[0]).toMatchObject({
            actionLabel: 'Создание темы',
            entityTypeLabel: 'База знаний (Темы)'
        });
    });

    it('раскрывает автора события', async () => {
        const { token } = await createAuthenticatedUser();
        const { user } = await createPlatformUser();
        await createLog({ user: user._id });

        const response = await authRequest(token).get(BASE);

        expect(response.body.data[0].user).toMatchObject({ firstName: user.firstName });
    });

    it('фильтрует по событию, категории и статусу', async () => {
        const { token } = await createAuthenticatedUser();
        await createLog({ action: 'TOPIC_CREATE', category: 'TOPICS' });
        await createLog({ action: 'TOPIC_DELETE', category: 'TOPICS', status: 'error' });

        const byAction = await authRequest(token).get(`${BASE}?action=TOPIC_DELETE`);
        const byStatus = await authRequest(token).get(`${BASE}?status=error`);
        const byCategory = await authRequest(token).get(`${BASE}?category=TOPICS`);

        expect(byAction.body.data).toHaveLength(1);
        expect(byStatus.body.data).toHaveLength(1);
        expect(byCategory.body.data).toHaveLength(2);
    });

    it('фильтрует по автору и сущности', async () => {
        const { token } = await createAuthenticatedUser();
        const { user } = await createPlatformUser();
        const entityId = new mongoose.Types.ObjectId();
        await createLog({ user: user._id, entityId });
        await createLog();

        const byUser = await authRequest(token).get(`${BASE}?user=${user._id}`);
        const byEntity = await authRequest(token).get(`${BASE}?entityId=${entityId}`);

        expect(byUser.body.data).toHaveLength(1);
        expect(byEntity.body.data).toHaveLength(1);
    });

    it('фильтрует по диапазону дат', async () => {
        const { token } = await createAuthenticatedUser();
        await createLog();

        const inside = await authRequest(token)
            .get(`${BASE}?startDate=${new Date(Date.now() - 60000).toISOString()}`);
        const outside = await authRequest(token)
            .get(`${BASE}?endDate=${new Date(Date.now() - 60000).toISOString()}`);

        expect(inside.body.data).toHaveLength(1);
        expect(outside.body.data).toHaveLength(0);
    });

    it('ищет по тексту сообщения без интерпретации спецсимволов', async () => {
        const { token } = await createAuthenticatedUser();
        await createLog({ message: 'Ошибка (критическая)' });

        const found = await authRequest(token).get(`${BASE}?search=${encodeURIComponent('(критическая)')}`);
        const wildcard = await authRequest(token).get(`${BASE}?search=${encodeURIComponent('.*')}`);

        expect(found.body.data).toHaveLength(1);
        expect(wildcard.body.data).toHaveLength(0);
    });

    it('отклоняет неизвестное событие в фильтре', async () => {
        const { token } = await createAuthenticatedUser();

        expect((await authRequest(token).get(`${BASE}?action=UNKNOWN`)).status).toBe(400);
    });

    it('отклоняет некорректную дату', async () => {
        const { token } = await createAuthenticatedUser();

        expect((await authRequest(token).get(`${BASE}?startDate=вчера`)).status).toBe(400);
    });

    it('требует право logs.read', async () => {
        const { token } = await createAuthenticatedUser({ permissions: ['topics.read'] });

        expect((await authRequest(token).get(BASE)).status).toBe(403);
    });

    it('требует авторизации', async () => {
        expect((await request(app).get(BASE)).status).toBe(401);
    });
});

describe(`GET ${BASE}/:id`, () => {
    it('возвращает подробности записи', async () => {
        const { token } = await createAuthenticatedUser();
        const log = await createLog();

        const response = await authRequest(token).get(`${BASE}/${log._id}`);

        expect(response.status).toBe(200);
        expect(response.body.data.actionLabel).toBe('Создание темы');
    });

    it('возвращает 404 для несуществующей записи', async () => {
        const { token } = await createAuthenticatedUser();

        expect((await authRequest(token).get(`${BASE}/${new mongoose.Types.ObjectId()}`)).status).toBe(404);
    });

    it('возвращает 400 для некорректного идентификатора', async () => {
        const { token } = await createAuthenticatedUser();

        expect((await authRequest(token).get(`${BASE}/not-an-id`)).status).toBe(400);
    });
});
