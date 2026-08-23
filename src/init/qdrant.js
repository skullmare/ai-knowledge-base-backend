const { qdrantClient } = require('../../config/qdrant');
const logger = require('../utils/logger');

async function initQdrant() {
    const collectionName = "knowledge_base";

    try {
        const collections = await qdrantClient.getCollections();
        const exists = collections.collections.some(c => c.name === collectionName);

        if (!exists) {
            await qdrantClient.createCollection(collectionName, {
                vectors: {
                    size: 1536, 
                    distance: 'Cosine'
                }
            });

            await qdrantClient.createPayloadIndex(collectionName, {
                field_name: "metadata.category",
                field_schema: "keyword"
            });

            await qdrantClient.createPayloadIndex(collectionName, {
                field_name: "metadata.accessibleByRoles",
                field_schema: "keyword"
            });

            await qdrantClient.createPayloadIndex(collectionName, {
                field_name: "metadata.topicId",
                field_schema: "keyword"
            });

            logger.success(`Инициализация коллекции ${collectionName} и всех индексов завершена`);
        } else {
            logger.success(`Коллекция ${collectionName} уже существует`);
        }
    } catch (error) {
        logger.error("Ошибка при инициализации Qdrant", null, error?.cause || error.message || error);
    }
}

module.exports = { initQdrant };