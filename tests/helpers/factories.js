const PlatformRole = require('../../src/models/platform-role');
const PlatformUser = require('../../src/models/platform-user');
const AgentRole = require('../../src/models/agent-role');
const AgentUser = require('../../src/models/agent-user');
const TopicCategory = require('../../src/models/topic-category');
const Topic = require('../../src/models/topic');
const Log = require('../../src/models/log');
const { hashPassword } = require('../../src/utils/password-handler');
const { ALL_PERMISSIONS } = require('../../src/constants/permissions');

let counter = 0;
const unique = (prefix) => `${prefix}-${++counter}-${Date.now().toString(36)}`;

const createPlatformRole = (overrides = {}) =>
    PlatformRole.create({
        name: unique('Роль'),
        description: 'Тестовая роль',
        permissions: ALL_PERMISSIONS,
        isSystem: false,
        ...overrides
    });

const createPlatformUser = async ({ password = 'Password123!', role, ...overrides } = {}) => {
    const platformRole = role === undefined ? (await createPlatformRole())._id : role;

    const user = await PlatformUser.create({
        firstName: 'Иван',
        lastName: 'Иванов',
        login: unique('user'),
        email: `${unique('mail')}@example.com`,
        password: await hashPassword(password),
        role: platformRole,
        status: 'active',
        ...overrides
    });

    return { user, plainPassword: password };
};

const createAgentRole = (overrides = {}) =>
    AgentRole.create({
        name: unique('Роль агента'),
        description: 'Тестовая роль агента',
        ...overrides
    });

const createAgentUser = (overrides = {}) =>
    AgentUser.create({
        firstName: 'Пётр',
        lastName: 'Петров',
        phone: `+7999${String(++counter).padStart(7, '0')}`,
        chatIdTG: unique('tg'),
        status: 'pending',
        ...overrides
    });

const createTopicCategory = (overrides = {}) =>
    TopicCategory.create({
        name: unique('Категория'),
        description: 'Тестовая категория',
        ...overrides
    });

const createTopic = async ({ category, roles, createdBy, ...overrides } = {}) => {
    const categoryId = category ?? (await createTopicCategory())._id;
    const roleIds = roles ?? [(await createAgentRole())._id];
    const authorId = createdBy ?? (await createPlatformUser()).user._id;

    return Topic.create({
        name: unique('Тема'),
        markdownContent: 'Содержимое тестовой темы',
        createdBy: authorId,
        metadata: { category: categoryId, accessibleByRoles: roleIds },
        ...overrides
    });
};

const createLog = (overrides = {}) =>
    Log.create({
        action: 'TOPIC_CREATE',
        message: 'Тестовая запись лога',
        category: 'TOPICS',
        entityType: 'Topic',
        status: 'success',
        ...overrides
    });

module.exports = {
    unique,
    createPlatformRole,
    createPlatformUser,
    createAgentRole,
    createAgentUser,
    createTopicCategory,
    createTopic,
    createLog
};
