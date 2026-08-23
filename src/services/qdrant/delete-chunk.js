const { qdrantClient } = require('../../../config/qdrant');

const COLLECTION = process.env.COLLECTION_NAME || 'knowledge_base';

const deleteByFilter = (key, value) => qdrantClient.delete(COLLECTION, {
    wait: true,
    filter: {
        must: [{ key, match: { value: value.toString() } }]
    }
});

async function deleteTopicFromQdrant(topicId) {
    return deleteByFilter('metadata.topicId', topicId);
}

async function deleteFileFromQdrant(fileId) {
    return deleteByFilter('metadata.fileId', fileId);
}

module.exports = { deleteTopicFromQdrant, deleteFileFromQdrant };
