const { QdrantClient } = require('@qdrant/js-client-rest');
const logger = require('../src/utils/logger');

const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL,
    // apiKey: process.env.QDRANT_API_KEY
});

logger.success(`Векторная база данных Qdrant инициализирована (адрес сервера: ${process.env.QDRANT_URL})`);

module.exports = { qdrantClient };