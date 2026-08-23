const mongoose = require('mongoose');
const { app, request, createAuthenticatedUser, authRequest } = require('../helpers/request');
const TopicCategory = require('../../src/models/topic-category');
const Log = require('../../src/models/log');
const { createTopicCategory, createTopic } = require('../helpers/factories');

const BASE = '/api/v1/topic/categories';

describe(`GET ${BASE}`, () => {
    it('возвращает список категорий массивом', async () => {
        const { token } = await createAuthenticatedUser();
        await Promise.all([createTopicCategory(), createTopicCategory()]);

        const response = await authRequest(token).get(BASE);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(2);
    });

    it('ищет по названию без интерпретации спецсимволов', async () => {
        const { token } = await createAuthenticatedUser();
        await createTopicCategory({ name: 'HR (кадры)' });

        const found = await authRequest(token).get(`${BASE}?search=${encodeURIComponent('(кадры)')}`);
        const wildcard = await authRequest(token).get(`${BASE}?search=${encodeURIComponent('.*')}`);

        expect(found.body.data).toHaveLength(1);
        expect(wildcard.body.data).toHaveLength(0);
    });

    it('требует право topicCategories.read', async () => {
        const { token } = await createAuthenticatedUser({ permissions: ['topics.read'] });

        expect((await authRequest(token).get(BASE)).status).toBe(403);
    });

    it('требует авторизации', async () => {
        expect((await request(app).get(BASE)).status).toBe(401);
    });
});

describe(`GET ${BASE}/:id`, () => {
    it('возвращает категорию', async () => {
        const { token } = await createAuthenticatedUser();
        const category = await createTopicCategory();

        const response = await authRequest(token).get(`${BASE}/${category._id}`);

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe(category.name);
    });

    it('возвращает 404 для несуществующей категории', async () => {
        const { token } = await createAuthenticatedUser();

        expect((await authRequest(token).get(`${BASE}/${new mongoose.Types.ObjectId()}`)).status).toBe(404);
    });
});

describe(`POST ${BASE}`, () => {
    it('создаёт категорию', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .post(BASE)
            .send({ name: 'Кадровые документы', description: 'Инструкции отдела кадров' });

        expect(response.status).toBe(201);
        expect(await TopicCategory.countDocuments()).toBe(1);
        expect(await Log.countDocuments({ action: 'CATEGORY_CREATE' })).toBe(1);
    });

    it('запрещает дублирующее название', async () => {
        const { token } = await createAuthenticatedUser();
        const existing = await createTopicCategory();

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
    it('обновляет название категории', async () => {
        const { token } = await createAuthenticatedUser();
        const category = await createTopicCategory();

        const response = await authRequest(token)
            .patch(`${BASE}/${category._id}`)
            .send({ name: 'Обновлённая категория' });

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe('Обновлённая категория');
    });

    it('запрещает занять название другой категории', async () => {
        const { token } = await createAuthenticatedUser();
        const [first, second] = await Promise.all([createTopicCategory(), createTopicCategory()]);

        const response = await authRequest(token)
            .patch(`${BASE}/${first._id}`)
            .send({ name: second.name });

        expect(response.status).toBe(400);
    });

    it('возвращает 400 для несуществующей категории', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .patch(`${BASE}/${new mongoose.Types.ObjectId()}`)
            .send({ name: 'Название' });

        expect(response.status).toBe(400);
    });
});

describe(`DELETE ${BASE}/:id`, () => {
    it('удаляет свободную категорию', async () => {
        const { token } = await createAuthenticatedUser();
        const category = await createTopicCategory();

        const response = await authRequest(token).delete(`${BASE}/${category._id}`);

        expect(response.status).toBe(200);
        expect(await TopicCategory.findById(category._id)).toBeNull();
    });

    it('запрещает удаление категории, используемой темой', async () => {
        const { token } = await createAuthenticatedUser();
        const category = await createTopicCategory();
        await createTopic({ category: category._id });

        const response = await authRequest(token).delete(`${BASE}/${category._id}`);

        expect(response.status).toBe(400);
        expect(response.body.errors[0].message).toMatch(/используется в топиках/);
    });
});

describe(`DELETE ${BASE}/delete/many`, () => {
    it('удаляет несколько свободных категорий', async () => {
        const { token } = await createAuthenticatedUser();
        const categories = await Promise.all([createTopicCategory(), createTopicCategory()]);

        const response = await authRequest(token)
            .delete(`${BASE}/delete/many`)
            .send({ ids: categories.map(category => category._id.toString()) });

        expect(response.status).toBe(200);
        expect(response.body.data.deletedCount).toBe(2);
        expect(await TopicCategory.countDocuments()).toBe(0);
    });

    it('отклоняет пакет, если категория используется', async () => {
        const { token } = await createAuthenticatedUser();
        const used = await createTopicCategory();
        const free = await createTopicCategory();
        await createTopic({ category: used._id });

        const response = await authRequest(token)
            .delete(`${BASE}/delete/many`)
            .send({ ids: [used._id.toString(), free._id.toString()] });

        expect(response.status).toBe(400);
        expect(await TopicCategory.countDocuments()).toBe(2);
    });

    it('отклоняет несуществующие идентификаторы', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token)
            .delete(`${BASE}/delete/many`)
            .send({ ids: [new mongoose.Types.ObjectId().toString()] });

        expect(response.status).toBe(400);
    });
});
