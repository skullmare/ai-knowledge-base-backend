const mongoose = require('mongoose');
const logger = require('../src/utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {});
    logger.success(`База данных ${conn.connection.name} успешно подключена (адрес сервера: ${conn.connection.host}:${conn.connection.port})`);
    
    mongoose.connection.on('error', (err) => {
      logger.error('Ошибка подключения к базе данных MongoDB', details = err.message || err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.error('MongoDB отключена'); 
    });

    return conn;
  } catch (error) {
    logger.error('Ошибка подключения к базе данных MongoDB', details = error.message);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.success('MongoDB соединение закрыто');
  } catch (error) {
    logger.error('Ошибка при закрытии базы данных MongoDB', details = error.message || error);
  }
};

module.exports = { connectDB, disconnectDB };