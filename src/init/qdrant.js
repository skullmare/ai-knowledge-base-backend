const { qdrantClient } = require('../../config/qdrant');
const { PAYLOAD_INDEXES } = require('../services/qdrant/recreate-collection');
const { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } = require('../constants/ai');
const logger = require('../utils/logger');

const COLLECTION = process.env.COLLECTION_NAME || 'knowledge_base';

async function initQdrant() {
    try {
        const vectorSize = EMBEDDING_DIMENSIONS;

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
                    `Размерность коллекции ${COLLECTION} (${currentSize}) не совпадает с размерностью ` +
                    `модели ${EMBEDDING_MODEL} (${vectorSize}). Векторизация будет падать — пересоздайте ` +
                    `коллекцию на вкладке «RouterAI» в настройках системы.`
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
