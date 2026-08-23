const mongoose = require('mongoose');
const PlatformUser = require('../../src/models/platform-user');
const PlatformRole = require('../../src/models/platform-role');
const AgentUser = require('../../src/models/agent-user');
const Topic = require('../../src/models/topic');
const Log = require('../../src/models/log');
const Message = require('../../src/models/message');
const { createAgentRole, createTopicCategory, createPlatformUser } = require('../helpers/factories');

describe('model/PlatformUser', () => {
    it('требует обязательные поля', async () => {
        await expect(PlatformUser.create({})).rejects.toThrow();
    });

    it('приводит логин и email к нижнему регистру', async () => {
        const role = await PlatformRole.create({ name: 'Роль', description: 'x', permissions: ['topics.read'] });
        const user = await PlatformUser.create({
            firstName: 'Иван', lastName: 'Иванов', login: 'IVAN', email: 'IVAN@Example.COM',
            password: 'hash', role: role._id
        });

        expect(user.login).toBe('ivan');
        expect(user.email).toBe('ivan@example.com');
    });

    it('отклоняет некорректный email', async () => {
        await expect(PlatformUser.create({
            firstName: 'Иван', lastName: 'Иванов', login: 'ivan', email: 'broken', password: 'hash'
        })).rejects.toThrow(/корректный email/);
    });

    it('не возвращает пароль без явного select', async () => {
        const { user } = await createPlatformUser();

        expect((await PlatformUser.findById(user._id)).password).toBeUndefined();
        expect((await PlatformUser.findById(user._id).select('+password')).password).toBeTruthy();
    });
});

describe('model/PlatformRole', () => {
    it('запрещает пустой список прав', async () => {
        await expect(PlatformRole.create({ name: 'Роль', description: 'x', permissions: [] }))
            .rejects.toThrow(/Список прав не может быть пустым/);
    });

    it('запрещает неизвестное право', async () => {
        await expect(PlatformRole.create({ name: 'Роль', description: 'x', permissions: ['topics.hack'] }))
            .rejects.toThrow();
    });
});

describe('model/AgentUser', () => {
    it('по умолчанию создаётся в статусе pending без роли', async () => {
        const user = await AgentUser.create({ chatIdTG: '900', phone: '+79990000301' });

        expect(user.status).toBe('pending');
        expect(user.role).toBeNull();
        expect(user.requestsCount).toBe(0);
    });

    it('допускает несколько записей без телефона', async () => {
        await AgentUser.syncIndexes();

        await AgentUser.create({ chatIdTG: '901' });
        await AgentUser.create({ chatIdTG: '902' });

        expect(await AgentUser.countDocuments()).toBe(2);
    });

    it('запрещает дубликат телефона', async () => {
        await AgentUser.syncIndexes();
        await AgentUser.create({ chatIdTG: '903', phone: '+79990000302' });

        await expect(AgentUser.create({ chatIdTG: '904', phone: '+79990000302' })).rejects.toThrow();
    });
});

describe('model/Topic', () => {
    it('проверяет существование категории', async () => {
        const role = await createAgentRole();

        await expect(Topic.create({
            name: 'Тема',
            createdBy: new mongoose.Types.ObjectId(),
            metadata: { category: new mongoose.Types.ObjectId(), accessibleByRoles: [role._id] }
        })).rejects.toThrow(/категория TopicCategory не существует/);
    });

    it('проверяет существование роли доступа', async () => {
        const category = await createTopicCategory();

        await expect(Topic.create({
            name: 'Тема',
            createdBy: new mongoose.Types.ObjectId(),
            metadata: { category: category._id, accessibleByRoles: [new mongoose.Types.ObjectId()] }
        })).rejects.toThrow(/роль AgentRole не существует/);
    });

    it('создаётся в статусе review и без индексации', async () => {
        const [category, role] = await Promise.all([createTopicCategory(), createAgentRole()]);

        const topic = await Topic.create({
            name: 'Тема',
            createdBy: new mongoose.Types.ObjectId(),
            metadata: { category: category._id, accessibleByRoles: [role._id] }
        });

        expect(topic.status).toBe('review');
        expect(topic.vectorData.isIndexed).toBe(false);
    });

    it('не отдаёт содержимое без явного select', async () => {
        const [category, role] = await Promise.all([createTopicCategory(), createAgentRole()]);
        const topic = await Topic.create({
            name: 'Тема',
            markdownContent: 'Содержимое',
            createdBy: new mongoose.Types.ObjectId(),
            metadata: { category: category._id, accessibleByRoles: [role._id] }
        });

        expect((await Topic.findById(topic._id)).markdownContent).toBeUndefined();
        expect((await Topic.findById(topic._id).select('+markdownContent')).markdownContent).toBe('Содержимое');
    });
});

describe('model/Log', () => {
    it('отклоняет неизвестное событие', async () => {
        await expect(Log.create({
            action: 'UNKNOWN', message: 'x', category: 'TOPICS', entityType: 'Topic'
        })).rejects.toThrow();
    });

    it('отклоняет неизвестную категорию', async () => {
        await expect(Log.create({
            action: 'TOPIC_CREATE', message: 'x', category: 'UNKNOWN', entityType: 'Topic'
        })).rejects.toThrow();
    });

    it('по умолчанию имеет статус success', async () => {
        const log = await Log.create({ action: 'TOPIC_CREATE', message: 'x', category: 'TOPICS', entityType: 'Topic' });

        expect(log.status).toBe('success');
    });
});

describe('model/Message', () => {
    it('допускает только роли user и assistant', async () => {
        await expect(Message.create({
            agentUserId: new mongoose.Types.ObjectId(), role: 'system', content: 'x'
        })).rejects.toThrow();
    });

    it('требует содержимое сообщения', async () => {
        await expect(Message.create({ agentUserId: new mongoose.Types.ObjectId(), role: 'user' }))
            .rejects.toThrow();
    });
});
