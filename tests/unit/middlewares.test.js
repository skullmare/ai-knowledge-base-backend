const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { z } = require('zod');

const { auth } = require('../../src/middlewares/auth');
const checkPermission = require('../../src/middlewares/permission');
const validate = require('../../src/middlewares/validate');
const authService = require('../../src/services/auth');
const PlatformUser = require('../../src/models/platform-user');
const { createPlatformRole, createPlatformUser } = require('../helpers/factories');

const buildApp = (...middlewares) => {
    const app = express();
    app.use(express.json());
    app.get('/protected', ...middlewares, (req, res) =>
        res.status(200).json({ ok: true, user: req.user, validated: req.validatedData })
    );
    return app;
};

describe('middlewares/auth', () => {
    it('пропускает активного пользователя с валидным токеном', async () => {
        const { user } = await createPlatformUser();
        const { accessToken } = authService.generateTokens({ id: user._id.toString(), role: user.role });

        const response = await request(buildApp(auth))
            .get('/protected')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.user.id).toBe(user._id.toString());
    });

    it('отклоняет запрос без заголовка авторизации', async () => {
        const response = await request(buildApp(auth)).get('/protected');

        expect(response.status).toBe(401);
        expect(response.body.errors[0].message).toMatch(/Токен не предоставлен/);
    });

    it('отклоняет схему авторизации, отличную от Bearer', async () => {
        const { user } = await createPlatformUser();
        const { accessToken } = authService.generateTokens({ id: user._id.toString(), role: user.role });

        const response = await request(buildApp(auth))
            .get('/protected')
            .set('Authorization', `Basic ${accessToken}`);

        expect(response.status).toBe(401);
    });

    it('отклоняет подделанный токен', async () => {
        const response = await request(buildApp(auth))
            .get('/protected')
            .set('Authorization', 'Bearer not-a-jwt');

        expect(response.status).toBe(401);
        expect(response.body.errors[0].message).toMatch(/Неверный или просроченный/);
    });

    it('не принимает refresh-токен вместо access-токена', async () => {
        const { user } = await createPlatformUser();
        const { refreshToken } = authService.generateTokens({ id: user._id.toString(), role: user.role });

        const response = await request(buildApp(auth))
            .get('/protected')
            .set('Authorization', `Bearer ${refreshToken}`);

        expect(response.status).toBe(401);
    });

    it('отклоняет токен удалённого пользователя', async () => {
        const { user } = await createPlatformUser();
        const { accessToken } = authService.generateTokens({ id: user._id.toString(), role: user.role });
        await PlatformUser.findByIdAndDelete(user._id);

        const response = await request(buildApp(auth))
            .get('/protected')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(401);
    });

    it('запрещает доступ заблокированному пользователю', async () => {
        const { user } = await createPlatformUser({ status: 'blocked' });
        const { accessToken } = authService.generateTokens({ id: user._id.toString(), role: user.role });

        const response = await request(buildApp(auth))
            .get('/protected')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(403);
    });
});

describe('middlewares/permission', () => {
    const withUser = (userId) => (req, res, next) => {
        req.user = { id: userId };
        next();
    };

    it('пропускает пользователя со всеми требуемыми правами', async () => {
        const role = await createPlatformRole({ permissions: ['topics.read', 'topics.create'] });
        const { user } = await createPlatformUser({ role: role._id });

        const response = await request(buildApp(withUser(user._id.toString()), checkPermission(['topics.read', 'topics.create'])))
            .get('/protected');

        expect(response.status).toBe(200);
    });

    it('отклоняет, если не хватает хотя бы одного права', async () => {
        const role = await createPlatformRole({ permissions: ['topics.read'] });
        const { user } = await createPlatformUser({ role: role._id });

        const response = await request(buildApp(withUser(user._id.toString()), checkPermission(['topics.read', 'topics.delete'])))
            .get('/protected');

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Недостаточно прав');
    });

    it('принимает право строкой, а не только массивом', async () => {
        const role = await createPlatformRole({ permissions: ['logs.read'] });
        const { user } = await createPlatformUser({ role: role._id });

        const response = await request(buildApp(withUser(user._id.toString()), checkPermission('logs.read')))
            .get('/protected');

        expect(response.status).toBe(200);
    });

    it('отклоняет пользователя без роли', async () => {
        const { user } = await createPlatformUser({ role: null });

        const response = await request(buildApp(withUser(user._id.toString()), checkPermission('logs.read')))
            .get('/protected');

        expect(response.status).toBe(403);
        expect(response.body.errors[0].path).toBe('role');
    });

    it('отклоняет несуществующего пользователя', async () => {
        const response = await request(buildApp(withUser(new mongoose.Types.ObjectId().toString()), checkPermission('logs.read')))
            .get('/protected');

        expect(response.status).toBe(403);
    });
});

describe('middlewares/validate', () => {
    const { paginationQuery } = require('../../src/schemas/common');

    const schema = z.object({
        query: z.object(paginationQuery(10)),
        body: z.object({}).loose()
    });

    it('кладёт разобранные данные в req.validatedData', async () => {
        const response = await request(buildApp(validate(schema))).get('/protected?page=3');

        expect(response.status).toBe(200);
        expect(response.body.validated.query.page).toBe(3);
    });

    it('подставляет числовые значения по умолчанию', async () => {
        const response = await request(buildApp(validate(schema))).get('/protected');

        expect(response.body.validated.query).toEqual({ page: 1, limit: 10 });
    });

    it('отклоняет лимит больше максимально разрешённого', async () => {
        const response = await request(buildApp(validate(schema))).get('/protected?limit=500');

        expect(response.status).toBe(400);
        expect(response.body.errors[0].message).toMatch(/не может быть больше 100/);
    });

    it('отклоняет нулевую страницу', async () => {
        const response = await request(buildApp(validate(schema))).get('/protected?page=0');

        expect(response.status).toBe(400);
    });

    it('возвращает 400 со списком ошибок и очищенными путями', async () => {
        const response = await request(buildApp(validate(schema))).get('/protected?page=abc');

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Ошибка валидации');
        expect(response.body.errors).toEqual([
            { path: 'page', message: 'Номер страницы должен быть числом' }
        ]);
    });
});

describe('middlewares/rateLimit', () => {
    const createRateLimit = require('../../src/middlewares/rateLimit');

    it('в тестовом окружении не ограничивает запросы', async () => {
        const app = buildApp(createRateLimit({ max: 1 }));

        const responses = await Promise.all([
            request(app).get('/protected'),
            request(app).get('/protected'),
            request(app).get('/protected')
        ]);

        expect(responses.every(response => response.status === 200)).toBe(true);
    });
});
