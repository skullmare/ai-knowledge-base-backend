const { app, request } = require('../helpers/request');

describe('GET /api/v1/health', () => {
    it('отвечает статусом OK и метаданными процесса', async () => {
        const response = await request(app).get('/api/v1/health');

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ status: 'OK' });
        expect(typeof response.body.uptime).toBe('number');
        expect(Date.parse(response.body.timestamp)).not.toBeNaN();
    });
});

describe('Неизвестный маршрут', () => {
    it('возвращает 404 в едином формате ошибки', async () => {
        const response = await request(app).get('/api/v1/unknown-route');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('не найден');
    });
});
