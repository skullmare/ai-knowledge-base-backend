const { QdrantClient } = require('@qdrant/js-client-rest');
const { env } = require('./env');
const logger = require('../src/utils/logger');

let client = null;

// Клиент создаётся лениво: подключение к Qdrant не должно быть
// побочным эффектом импорта модуля (ломает тесты и локальный запуск без Qdrant).
const getQdrantClient = () => {
    if (client) return client;

    const url = process.env.QDRANT_URL;

    client = new QdrantClient({
        url,
        apiKey: process.env.QDRANT_API_KEY,
        // Схема (http/https) берётся из URL; port: null не даёт клиенту
        // подставить :6333 к managed-адресу без явного порта.
        port: null,
        checkCompatibility: !env.isTest
    });

    logger.success(`Векторная база данных Qdrant инициализирована (адрес сервера: ${url})`);
    return client;
};

// Прокси сохраняет прежний интерфейс `qdrantClient.search(...)`,
// но откладывает создание клиента до первого обращения.
const qdrantClient = new Proxy({}, {
    get: (_target, property) => {
        const instance = getQdrantClient();
        const value = instance[property];
        return typeof value === 'function' ? value.bind(instance) : value;
    }
});

module.exports = { qdrantClient, getQdrantClient, collectionName: env.qdrantCollection };
