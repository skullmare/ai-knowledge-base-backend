require('dotenv').config();
const app = require('./src/app');
const { connectDB, disconnectDB } = require('./config/mongo');
const { seedPlatformRoles } = require('./src/init/platform-role');
const { seedAgentRoles } = require('./src/init/agent-role');
const { seedSuperAdmin } = require('./src/init/super-admin');
const { seedSystemSettings } = require('./src/init/system-settings');
const { seedTopicCategories } = require('./src/init/topic-category');
const { initQdrant } = require('./src/init/qdrant');
const { initHocuspocus } = require('./src/services/init-collaboration'); // ← добавили
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;
let server;

const startServer = async () => {
  try {
    await connectDB();
    
    await seedPlatformRoles();
    await seedAgentRoles();
    await seedSystemSettings();
    await seedTopicCategories();
    await seedSuperAdmin();
    await initQdrant();
    await initHocuspocus();

    server = app.listen(PORT, () => {
      logger.success(`Сервер запущен на порту ${PORT} | http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Ошибка при запуске', null, error.message || error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  logger.error(`Получен сигнал ${signal}`);

  if (server) {
    server.close(() => {
      logger.error('Сервер остановлен');
    });
  }

  await disconnectDB();
  logger.success('Приложение остановлено');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();