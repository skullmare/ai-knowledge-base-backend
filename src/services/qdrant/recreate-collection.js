const { qdrantClient } = require('../../../config/qdrant');
const { getNumberSetting } = require('../settings');
const logger = require('../../utils/logger');

const COLLECTION = process.env.COLLECTION_NAME || 'knowledge_base';

const PAYLOAD_INDEXES = [
    { field_name: 'metadata.category', field_schema: 'keyword' },
    { field_name: 'metadata.accessibleByRoles', field_schema: 'keyword' },
    { field_name: 'metadata.topicId', field_schema: 'keyword' },
    { field_name: 'metadata.fileId', field_schema: 'keyword' },
    { field_name: 'metadata.source', field_schema: 'keyword' },
];

/**
 * Пересоздаёт коллекцию под текущую размерность эмбеддингов.
 * Все векторы теряются — темы и файлы нужно векторизовать заново,
 * поэтому их признаки индексации сбрасываются здесь же.
 */
async function recreateCollection() {
    const vectorSize = await getNumberSetting('ai_embedding_dimensions', 3072);

    const collections = await qdrantClient.getCollections();
    if (collections.collections.some(c => c.name === COLLECTION)) {
        await qdrantClient.deleteCollection(COLLECTION);
    }

    await qdrantClient.createCollection(COLLECTION, {
        vectors: { size: vectorSize, distance: 'Cosine' }
    });

    for (const index of PAYLOAD_INDEXES) {
        await qdrantClient.createPayloadIndex(COLLECTION, index);
    }

    logger.success(`Коллекция ${COLLECTION} пересоздана (размерность ${vectorSize})`);

    return { collection: COLLECTION, vectorSize };
}

module.exports = { recreateCollection, PAYLOAD_INDEXES };
