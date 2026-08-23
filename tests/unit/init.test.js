const mocks = require('../helpers/mocks');
const PlatformRole = require('../../src/models/platform-role');
const PlatformUser = require('../../src/models/platform-user');
const AgentUser = require('../../src/models/agent-user');
const { seedPlatformRoles } = require('../../src/init/platform-role');
const { seedSuperAdmin } = require('../../src/init/super-admin');
const { syncAgentUserIndexes } = require('../../src/init/agent-user-index');
const { initQdrant } = require('../../src/init/qdrant');
const { comparePassword } = require('../../src/utils/password-handler');
const { ALL_PERMISSIONS } = require('../../src/constants/permissions');

describe('init/platform-role', () => {
    it('создаёт системную роль со всеми правами', async () => {
        await seedPlatformRoles();

        const role = await PlatformRole.findOne({ name: 'Системный администратор' });
        expect(role.isSystem).toBe(true);
        expect(role.permissions.sort()).toEqual([...ALL_PERMISSIONS].sort());
    });

    it('идемпотентен при повторном запуске', async () => {
        await seedPlatformRoles();
        await seedPlatformRoles();

        expect(await PlatformRole.countDocuments({ name: 'Системный администратор' })).toBe(1);
    });

    it('восстанавливает список прав, если его изменили вручную', async () => {
        await seedPlatformRoles();
        await PlatformRole.updateOne({ name: 'Системный администратор' }, { permissions: ['topics.read'] });

        await seedPlatformRoles();

        const role = await PlatformRole.findOne({ name: 'Системный администратор' });
        expect(role.permissions.length).toBe(ALL_PERMISSIONS.length);
    });
});

describe('init/super-admin', () => {
    it('создаёт администратора с системной ролью', async () => {
        await seedPlatformRoles();
        await seedSuperAdmin();

        const admin = await PlatformUser.findOne({ login: process.env.LOGIN_SUPER_ADMIN }).select('+password');
        expect(admin.isSystem).toBe(true);
        await expect(comparePassword(process.env.PASSWORD_SUPER_ADMIN, admin.password)).resolves.toBe(true);
    });

    it('не создаёт дубликат при повторном запуске', async () => {
        await seedPlatformRoles();
        await seedSuperAdmin();
        await seedSuperAdmin();

        expect(await PlatformUser.countDocuments({ login: process.env.LOGIN_SUPER_ADMIN })).toBe(1);
    });

    it('ничего не делает без системной роли', async () => {
        await seedSuperAdmin();

        expect(await PlatformUser.countDocuments()).toBe(0);
    });
});

describe('init/agent-user-index', () => {
    it('удаляет устаревший составной индекс прежней схемы', async () => {
        await AgentUser.createCollection();
        await AgentUser.collection.createIndex({ chatId: 1, messenger: 1 }, { name: 'chatId_1_messenger_1', unique: true });

        await syncAgentUserIndexes();

        const names = (await AgentUser.collection.indexes()).map(index => index.name);
        expect(names).not.toContain('chatId_1_messenger_1');
    });

    it('приводит индексы в соответствие со схемой', async () => {
        await AgentUser.createCollection();

        await syncAgentUserIndexes();

        const names = (await AgentUser.collection.indexes()).map(index => index.name);
        expect(names).toEqual(expect.arrayContaining(['chatIdTG_1', 'chatIdMAX_1', 'phone_1']));
    });

    it('позволяет создать нескольких пользователей без chatIdMAX', async () => {
        await AgentUser.createCollection();
        await syncAgentUserIndexes();

        await AgentUser.create({ chatIdTG: '1', phone: '+79990000201' });
        await AgentUser.create({ chatIdTG: '2', phone: '+79990000202' });

        expect(await AgentUser.countDocuments()).toBe(2);
    });
});

describe('init/qdrant', () => {
    it('создаёт коллекцию и payload-индексы, если её ещё нет', async () => {
        await initQdrant();

        expect(mocks.qdrant.createCollection).toHaveBeenCalledWith('knowledge_base_test', expect.objectContaining({
            vectors: { size: 1536, distance: 'Cosine' }
        }));
        expect(mocks.qdrant.createPayloadIndex).toHaveBeenCalledTimes(3);
    });

    it('не пересоздаёт существующую коллекцию, но обновляет индексы', async () => {
        mocks.qdrant.getCollections.mockResolvedValueOnce({ collections: [{ name: 'knowledge_base_test' }] });

        await initQdrant();

        expect(mocks.qdrant.createCollection).not.toHaveBeenCalled();
        expect(mocks.qdrant.createPayloadIndex).toHaveBeenCalledTimes(3);
    });

    it('не роняет запуск приложения при недоступном Qdrant', async () => {
        mocks.qdrant.getCollections.mockRejectedValueOnce(new Error('Qdrant недоступен'));

        await expect(initQdrant()).resolves.toBeUndefined();
    });
});

describe('config/env', () => {
    const loadEnv = () => {
        jest.resetModules();
        return require('../../config/env');
    };

    it('требует ключевые переменные только в проде', () => {
        const { assertRequiredEnv } = loadEnv();

        expect(() => assertRequiredEnv()).not.toThrow();
    });

    it('падает в проде без обязательных переменных', () => {
        process.env.NODE_ENV = 'production';
        const savedSecret = process.env.JWT_ACCESS_SECRET;
        delete process.env.JWT_ACCESS_SECRET;

        try {
            const { assertRequiredEnv } = loadEnv();
            expect(() => assertRequiredEnv()).toThrow(/JWT_ACCESS_SECRET/);
        } finally {
            process.env.JWT_ACCESS_SECRET = savedSecret;
            process.env.NODE_ENV = 'test';
        }
    });

    it('разбирает список разрешённых origin из переменной окружения', () => {
        process.env.CORS_ORIGINS = 'https://a.example.com, https://b.example.com';

        try {
            const { env } = loadEnv();
            expect(env.corsOrigins).toEqual(['https://a.example.com', 'https://b.example.com']);
        } finally {
            delete process.env.CORS_ORIGINS;
        }
    });

    // Пустой список origin означает, что браузер не получит
    // Access-Control-Allow-Origin и фронтенд перестанет работать целиком.
    it.each(['production', 'test', undefined])(
        'никогда не оставляет список origin пустым (NODE_ENV=%s)',
        (nodeEnv) => {
            const savedEnv = process.env.NODE_ENV;
            const savedOrigins = process.env.CORS_ORIGINS;
            delete process.env.CORS_ORIGINS;

            if (nodeEnv === undefined) delete process.env.NODE_ENV;
            else process.env.NODE_ENV = nodeEnv;

            try {
                const { env } = loadEnv();
                expect(env.corsOrigins.length).toBeGreaterThan(0);
            } finally {
                process.env.NODE_ENV = savedEnv;
                if (savedOrigins) process.env.CORS_ORIGINS = savedOrigins;
            }
        }
    );

    it('в разработке разрешает локальный дев-сервер', () => {
        const savedEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        try {
            const { env } = loadEnv();
            expect(env.corsOrigins).toContain('http://localhost:5173');
        } finally {
            process.env.NODE_ENV = savedEnv;
        }
    });
});
