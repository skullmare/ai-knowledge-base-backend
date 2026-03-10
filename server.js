require('dotenv').config();
const app = require('./src/app');
const { connectDB, disconnectDB } = require('./config/mongo');
const { seedRoles } = require('./src/init/seedRoles');
const { seedAgentRoles } = require('./src/init/seedAgentRoles');
const { seedSuperAdmin } = require('./src/init/seedSuperAdmin');
const { seedSystemSettings } = require('./src/init/seedSystemSettings');
const { seedTopicCategories } = require('./src/init/seedTopicCategories');
const { initQdrant } = require('./src/init/initQdrant');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;
let server;

const startServer = async () => {
  try {
    await connectDB();
    await seedRoles();
    await seedAgentRoles();
    await seedSystemSettings();
    await seedTopicCategories();
    await seedSuperAdmin();
    await initQdrant();
    server = app.listen(PORT, () => {
      logger.success(`Сервер запущен на порту ${PORT} | http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Ошибка при запуске', details = error.message || error);
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