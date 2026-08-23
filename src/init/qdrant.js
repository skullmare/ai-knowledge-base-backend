const { qdrantClient } = require('../../config/qdrant');
const { getNumberSetting } = require('../services/settings');
const logger = require('../utils/logger');

const COLLECTION = process.env.COLLECTION_NAME || 'knowledge_base';

const PAYLOAD_INDEXES = [
    { field_name: 'metadata.category', field_schema: 'keyword' },
    { field_name: 'metadata.accessibleByRoles', field_schema: 'keyword' },
    { field_name: 'metadata.topicId', field_schema: 'keyword' },
    { field_name: 'metadata.fileId', field_schema: 'keyword' },
    { field_name: 'metadata.source', field_schema: 'keyword' },
];

async function initQdrant() {
    try {
        const vectorSize = await getNumberSetting('ai_embedding_dimensions', 3072);

        const collections = await qdrantClient.getCollections();
        const exists = collections.collections.some(c => c.name === COLLECTION);

        if (!exists) {
            await qdrantClient.createCollection(COLLECTION, {
                vectors: {
                    size: vectorSize,
                    distance: 'Cosine'
                }
            });
            logger.success(`Коллекция ${COLLECTION} создана (размерность ${vectorSize})`);
        } else {
            const info = await qdrantClient.getCollection(COLLECTION);
            const currentSize = info?.config?.params?.vectors?.size;

            if (currentSize && currentSize !== vectorSize) {
                logger.error(
                    `Размерность коллекции ${COLLECTION} (${currentSize}) не совпадает с настройкой ` +
                    `«Размерность векторов» (${vectorSize}). Векторизация будет падать — приведите ` +
                    `настройку к размерности модели эмбеддингов или пересоздайте коллекцию.`
                );
            }
        }

        // Индексы идемпотентны: повторное создание существующего — не ошибка
        for (const index of PAYLOAD_INDEXES) {
            try {
                await qdrantClient.createPayloadIndex(COLLECTION, index);
            } catch (error) {
                logger.debug(`Индекс ${index.field_name} уже существует: ${error.message}`);
            }
        }

        logger.success(`Инициализация коллекции ${COLLECTION} и всех индексов завершена`);
    } catch (error) {
        logger.error('Ошибка при инициализации Qdrant', null, error?.cause || error.message || error);
    }
}

module.exports = { initQdrant };
