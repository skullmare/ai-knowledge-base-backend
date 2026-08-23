const { qdrantClient } = require('../../../config/qdrant');

const { COLLECTION_NAME } = process.env;

async function deleteTopicFromQdrant(topicId) {
    return qdrantClient.delete(COLLECTION_NAME, {
        filter: {
            must: [{ key: "metadata.topicId", match: { value: topicId.toString() } }]
        }
    });
}

module.exports = { deleteTopicFromQdrant };