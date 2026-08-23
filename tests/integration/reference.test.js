const { app, request } = require('../helpers/request');
const { ALL_PERMISSIONS } = require('../../src/constants/permissions');
const { ALL_ACTIONS } = require('../../src/constants/actions');

describe('GET /api/v1/permissions', () => {
    it('возвращает права, сгруппированные для интерфейса', async () => {
        const response = await request(app).get('/api/v1/permissions');

        expect(response.status).toBe(200);
        expect(response.body.data[0]).toHaveProperty('group');
        expect(response.body.data[0].actions[0]).toMatchObject({
            key: expect.any(String),
            label: expect.any(String)
        });
    });

    it('перечисляет все известные права ровно один раз', async () => {
        const response = await request(app).get('/api/v1/permissions');
        const keys = response.body.data.flatMap(group => group.actions.map(action => action.key));

        expect(keys.sort()).toEqual([...ALL_PERMISSIONS].sort());
    });
});

describe('GET /api/v1/actions', () => {
    it('возвращает события, сгруппированные по категориям', async () => {
        const response = await request(app).get('/api/v1/actions');

        expect(response.status).toBe(200);
        expect(response.body.data[0]).toMatchObject({
            category: expect.any(String),
            group: expect.any(String)
        });
    });

    it('перечисляет все известные события ровно один раз', async () => {
        const response = await request(app).get('/api/v1/actions');
        const keys = response.body.data.flatMap(group => group.actions.map(action => action.key));

        expect(keys.sort()).toEqual([...ALL_ACTIONS].sort());
    });
});
