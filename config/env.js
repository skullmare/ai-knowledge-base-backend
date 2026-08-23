const REQUIRED_IN_PRODUCTION = [
    'MONGODB_URI',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET'
];

const toList = (value, fallback = []) =>
    value ? value.split(',').map(item => item.trim()).filter(Boolean) : fallback;

const env = {
    get nodeEnv() {
        return process.env.NODE_ENV || 'development';
    },
    get isDev() {
        return this.nodeEnv === 'development';
    },
    get isTest() {
        return this.nodeEnv === 'test';
    },
    get isProd() {
        return this.nodeEnv === 'production';
    },
    get port() {
        return Number(process.env.PORT) || 3000;
    },
    get corsOrigins() {
        return toList(
            process.env.CORS_ORIGINS,
            this.isProd ? [] : ['http://localhost:5173', 'http://localhost:5174']
        );
    },
    get cookieDomain() {
        return process.env.MAIN_DOMAIN || undefined;
    },
    get qdrantCollection() {
        return process.env.COLLECTION_NAME || 'knowledge_base';
    },
    get bucketName() {
        return process.env.BUCKET_NAME;
    }
};

// Отсутствие ключевых переменных в проде — причина упасть на старте,
// а не отдавать 500 на каждом запросе.
const assertRequiredEnv = () => {
    if (!env.isProd) return;

    const missing = REQUIRED_IN_PRODUCTION.filter(name => !process.env[name]);
    if (missing.length) {
        throw new Error(`Не заданы обязательные переменные окружения: ${missing.join(', ')}`);
    }
};

module.exports = { env, assertRequiredEnv };
