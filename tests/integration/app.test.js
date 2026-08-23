const express = require('express');
const supertest = require('supertest');
const { app, request, createAuthenticatedUser, authRequest } = require('../helpers/request');
const sendError = require('../../src/utils/error-handler');

describe('Приложение', () => {
    it('отдаёт CORS-заголовки разрешённому origin', async () => {
        const response = await request(app)
            .get('/api/v1/health')
            .set('Origin', 'http://localhost:5173');

        expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
        expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('не разрешает запрещённый origin', async () => {
        const response = await request(app)
            .get('/api/v1/health')
            .set('Origin', 'https://evil.example.com');

        expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('разбирает JSON-тело запроса', async () => {
        const response = await request(app)
            .post('/api/v1/auth/login')
            .send({ login: 'someone', password: 'Password123' });

        expect(response.status).toBe(401);
    });

    it('возвращает 400 на некорректный JSON', async () => {
        const response = await request(app)
            .post('/api/v1/auth/login')
            .set('Content-Type', 'application/json')
            .send('{"login": ');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    it('отклоняет тело больше лимита', async () => {
        const response = await request(app)
            .post('/api/v1/auth/login')
            .send({ login: 'a', password: 'x'.repeat(2 * 1024 * 1024) });

        expect(response.status).toBe(413);
        expect(response.body.success).toBe(false);
    });

    it('возвращает 404 в едином формате для неизвестного метода на существующем пути', async () => {
        const { token } = await createAuthenticatedUser();

        const response = await authRequest(token).put('/api/v1/topics');

        expect(response.status).toBe(404);
        expect(response.body).toMatchObject({ success: false });
    });
});

describe('Обработчик необработанных ошибок', () => {
    // Отдельное приложение с той же связкой middleware: в основном приложении
    // все контроллеры ловят ошибки сами, и в централизованный обработчик не попасть.
    const buildFailingApp = () => {
        const failing = express();

        failing.get('/boom', () => {
            throw Object.assign(new Error('Секретная деталь реализации'), { status: 500 });
        });

        failing.get('/bad-request', () => {
            throw Object.assign(new Error('Некорректные данные'), { status: 422, errors: [{ path: 'x', message: 'плохо' }] });
        });

        // eslint-disable-next-line no-unused-vars
        failing.use((err, req, res, next) => {
            const status = err.status || 500;
            const message = status < 500 ? err.message : 'Внутренняя ошибка сервера';
            sendError(res, status, message, err.errors || []);
        });

        return failing;
    };

    it('не раскрывает детали серверной ошибки', async () => {
        const response = await supertest(buildFailingApp()).get('/boom');

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Внутренняя ошибка сервера');
        expect(JSON.stringify(response.body)).not.toContain('Секретная деталь');
    });

    it('сохраняет сообщение и детали клиентской ошибки', async () => {
        const response = await supertest(buildFailingApp()).get('/bad-request');

        expect(response.status).toBe(422);
        expect(response.body.message).toBe('Некорректные данные');
        expect(response.body.errors).toEqual([{ path: 'x', message: 'плохо' }]);
    });
});
