const REQUIRED_IN_PRODUCTION = [
    'MONGODB_URI',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET'
];

const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];

// Запасной список для окружений, где CORS_ORIGINS ещё не задан.
// Пустой список здесь недопустим: браузер не получит Access-Control-Allow-Origin
// и весь фронтенд перестанет работать из-за незаданной переменной.
const DEFAULT_ORIGINS = ['https://front-operon123.amvera.io'];

const toList = (value) => value.split(',').map(item => item.trim()).filter(Boolean);

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
        if (process.env.CORS_ORIGINS) return toList(process.env.CORS_ORIGINS);

        return this.isDev ? DEV_ORIGINS : DEFAULT_ORIGINS;
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
