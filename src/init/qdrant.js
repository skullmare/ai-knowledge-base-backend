const { qdrantClient, collectionName } = require('../../config/qdrant');
const logger = require('../utils/logger');

const VECTOR_SIZE = Number(process.env.EMBEDDING_VECTOR_SIZE) || 1536;
const PAYLOAD_INDEXES = ['metadata.category', 'metadata.accessibleByRoles', 'metadata.topicId'];

async function initQdrant() {
    try {
        const { collections } = await qdrantClient.getCollections();
        const exists = collections.some(collection => collection.name === collectionName);

        if (!exists) {
            await qdrantClient.createCollection(collectionName, {
                vectors: { size: VECTOR_SIZE, distance: 'Cosine' }
            });
            logger.success(`Коллекция ${collectionName} создана`);
        }

        // Индексы создаются каждый запуск (операция идемпотентна):
        // коллекция могла быть создана вручную или раньше, чем появились фильтры.
        for (const field of PAYLOAD_INDEXES) {
            await qdrantClient.createPayloadIndex(collectionName, {
                field_name: field,
                field_schema: 'keyword'
            });
        }

        logger.success(`Инициализация коллекции ${collectionName} и payload-индексов завершена`);
    } catch (error) {
        logger.error('Ошибка при инициализации Qdrant', null, error?.cause || error.message || error);
    }
}

module.exports = { initQdrant };
