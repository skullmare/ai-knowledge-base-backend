const mongoose = require('mongoose');
const mocks = require('../helpers/mocks');
const { app, request, createAuthenticatedUser, authRequest } = require('../helpers/request');
const AgentUser = require('../../src/models/agent-user');
const Log = require('../../src/models/log');
const { createAgentRole, createAgentUser } = require('../helpers/factories');

const BASE = '/api/v1/agent/users';

describe(`GET ${BASE}`, () => {
    it('возвращает список с пагинацией', async () => {
        const { token } = await createAuthenticatedUser();
        await Promise.all([createAgentUser(), createAgentUser(), createAgentUser()]);

        const response = await authRequest(token).get(`${BASE}?page=2&limit=2`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.pagination).toMatchObject({ total: 3, current: 2, pages: 2 });
    });

    it('фильтрует по статусу и роли', async () => {
        const { token } = await createAuthenticatedUser();
        const role = await createAgentRole();
        await createAgentUser({ role: role._id, status: 'active' });
        await createAgentUser({ status: 'blocked' });

        const byStatus = await authRequest(token).get(`${BASE}?status=blocked`);
        const byRole = await authRequest(token).get(`${BASE}?role=${role._id}`);

        expect(byStatus.body.data).toHaveLength(1);
        expect(byRole.body.data).toHaveLength(1);
    });

    it('фильтрует по наличию телефона', async () => {
        const { token } = await createAuthenticatedUser();
        await createAgentUser({ phone: '+79990000101' });
        await createAgentUser({ phone: null });

        const withPhone = await authRequest(token).get(`${BASE}?hasPhone=true`);
        const withoutPhone = await authRequest(token).get(`${BASE}?hasPhone=false`);

        expect(withPhone.body.data).toHaveLength(1);
        expect(withoutPhone.body.data).toHaveLength(1);
    });

    it('ищет по имени и телефону', async () => {
        const { token } = await createAuthenticatedUser();
        await createAgentUser({ firstName: 'Уникальный' });

        const response = await authRequest(token).get(`${BASE}?search=Уникальный`);

        expect(response.body.data).toHaveLength(1);
    });

    it('отдаёт имя и фамилию отдельными полями', async () => {
        const { token } = await createAuthenticatedUser();
        await createAgentUser({ firstName: 'Иван', lastName: 'Петров' });

        const response = await authRequest(token).get(BASE);

        expect(response.body.data[0]).toMatchObject({ firstName: 'Иван', lastName: 'Петров' });
    });

    it('требует право agentUsers.read', async () => {
        const { token } = await createAuthenticatedUser({ permissions: ['topics.read'] });

        expect((await authRequest(token).get(BASE)).status).toBe(403);
    });

    it('требует авторизации', async () => {
        expect((await request(app).get(BASE)).status).toBe(401);
    });
});

describe(`GET ${BASE}/:id`, () => {
    it('возвращает пользователя агента', async () => {
        const { token } = await createAuthenticatedUser();
        const agentUser = await createAgentUser();

        const response = await authRequest(token).get(`${BASE}/${agentUser._id}`);

        expect(response.status).toBe(200);
        expect(response.body.data._id).toBe(agentUser._id.toString());
    });

    it('возвращает 400 для несуществующего пользователя', async () => {
        const { token } = await createAuthenticatedUser();

        expect((await authRequest(token).get(`${BASE}/${new mongoose.Types.ObjectId()}`)).status).toBe(400);
    });
});

describe(`PATCH ${BASE}/:id`, () => {
    it('назначает роль и автоматически активирует пользователя', async () => {
        const { token } = await createAuthenticatedUser();
        const role = await createAgentRole();
        const agentUser = await createAgentUser({ role: null, status: 'pending' });

        const response = await authRequest(token)
            .patch(`${BASE}/${agentUser._id}`)
            .send({ role: role._id.toString() });

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('active');
        expect(response.body.data.role.name).toBe(role.name);
    });

    it('уведомляет пользователя о выданном доступе', async () => {
        const { token } = await createAuthenticatedUser();
        const role = await createAgentRole();
        const agentUser = await createAgentUser({ role: null, chatIdTG: '4242' });

        await authRequest(token).patch(`${BASE}/${agentUser._id}`).send({ role: role._id.toString() });

        expect(mocks.telegramBot.sendMessage).toHaveBeenCalledWith('4242', expect.stringContaining('доступ к ИИ-агенту'));
    });

    it('не уведомляет повторно, если роль уже была', async () => {
        const { token } = await createAuthenticatedUser();
        const [oldRole, newRole] = await Promise.all([createAgentRole(), createAgentRole()]);
        const agentUser = await createAgentUser({ role: oldRole._id, chatIdTG: '4243' });

        await authRequest(token).patch(`${BASE}/${agentUser._id}`).send({ role: newRole._id.toString() });

        expect(mocks.telegramBot.sendMessage).not.toHaveBeenCalled();
    });

    it('не проваливает запрос, если мессенджер недоступен', async () => {
        const { token } = await createAuthenticatedUser();
        const role = await createAgentRole();
        const agentUser = await createAgentUser({ role: null, chatIdTG: '4244' });
        mocks.telegramBot.sendMessage.mockRejectedValueOnce(new Error('Telegram недоступен'));

        const response = await authRequest(token)
            .patch(`${BASE}/${agentUser._id}`)
            .send({ role: role._id.toString() });

        expect(response.status).toBe(200);
    });

    it('блокирует пользователя', async () => {
        const { token } = await createAuthenticatedUser();
        const agentUser = await createAgentUser();

        const response = await authRequest(token)
            .patch(`${BASE}/${agentUser._id}`)
            .send({ status: 'blocked' });

        expect(response.status).toBe(200);
        expect((await AgentUser.findById(agentUser._id)).status).toBe('blocked');
    });

    it('требует хотя бы одно поле для обновления', async () => {
        const { token } = await createAuthenticatedUser();
        const agentUser = await createAgentUser();

        const response = await authRequest(token).patch(`${BASE}/${agentUser._id}`).send({});

        expect(response.status).toBe(400);
    });

    it('отклоняет несуществующую роль', async () => {
        const { token } = await createAuthenticatedUser();
        const agentUser = await createAgentUser();

        const response = await authRequest(token)
            .patch(`${BASE}/${agentUser._id}`)
            .send({ role: new mongoose.Types.ObjectId().toString() });

        expect(response.status).toBe(400);
    });

    it('пишет обновление в журнал', async () => {
        const { token } = await createAuthenticatedUser();
        const agentUser = await createAgentUser();

        await authRequest(token).patch(`${BASE}/${agentUser._id}`).send({ status: 'blocked' });

        expect(await Log.countDocuments({ action: 'AGENT_USER_UPDATE' })).toBe(1);
    });
});

describe(`DELETE ${BASE}/:id`, () => {
    it('удаляет пользователя агента', async () => {
        const { token } = await createAuthenticatedUser();
        const agentUser = await createAgentUser();

        const response = await authRequest(token).delete(`${BASE}/${agentUser._id}`);

        expect(response.status).toBe(200);
        expect(await AgentUser.findById(agentUser._id)).toBeNull();
        expect(await Log.countDocuments({ action: 'AGENT_USER_DELETE' })).toBe(1);
    });

    it('требует право agentUsers.delete', async () => {
        const { token } = await createAuthenticatedUser({ permissions: ['agentUsers.read'] });
        const agentUser = await createAgentUser();

        expect((await authRequest(token).delete(`${BASE}/${agentUser._id}`)).status).toBe(403);
    });
});
