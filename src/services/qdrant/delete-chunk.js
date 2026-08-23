const { qdrantClient, collectionName } = require('../../../config/qdrant');

async function deleteTopicFromQdrant(topicId) {
    return qdrantClient.delete(collectionName, {
        wait: true,
        filter: {
            must: [{ key: 'metadata.topicId', match: { value: String(topicId) } }]
        }
    });
}

module.exports = { deleteTopicFromQdrant };
