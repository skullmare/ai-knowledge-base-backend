require('dotenv').config();

const app = require('./src/app');
const { env, assertRequiredEnv } = require('./config/env');
const { connectDB, disconnectDB } = require('./config/mongo');
const { seedPlatformRoles } = require('./src/init/platform-role');
const { seedSuperAdmin } = require('./src/init/super-admin');
const { syncAgentUserIndexes } = require('./src/init/agent-user-index');
const { initQdrant } = require('./src/init/qdrant');
const { initHocuspocus } = require('./src/services/init-collaboration');
const { initBot } = require('./src/services/telegram/bot');
const { initMaxBot } = require('./src/services/max/bot');
const logger = require('./src/utils/logger');

const SHUTDOWN_TIMEOUT_MS = 10_000;

let server = null;
let shuttingDown = false;

const startServer = async () => {
    assertRequiredEnv();

    await connectDB();

    await seedPlatformRoles();
    await seedSuperAdmin();
    await syncAgentUserIndexes();
    await initQdrant();
    await initHocuspocus();

    initBot();
    initMaxBot();

    server = app.listen(env.port, () => {
        logger.success(`Сервер запущен на порту ${env.port} | http://localhost:${env.port}`);
    });
};

const closeServer = () => new Promise((resolve) => {
    if (!server) return resolve();

    // Если открытые соединения не дают закрыться — выходим по таймауту,
    // иначе контейнер висит до SIGKILL.
    const timer = setTimeout(resolve, SHUTDOWN_TIMEOUT_MS);
    server.close(() => {
        clearTimeout(timer);
        resolve();
    });
});

const gracefulShutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.warn(`Получен сигнал ${signal}, останавливаем приложение`);

    await closeServer();
    await disconnectDB();

    logger.success('Приложение остановлено');
    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
    logger.error('Необработанное отклонение промиса', null, reason?.message || reason);
});

startServer().catch((error) => {
    logger.error('Ошибка при запуске', null, error.message || error);
    process.exit(1);
});
