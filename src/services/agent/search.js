const { qdrantClient } = require('../../../config/qdrant');

const COLLECTION = process.env.COLLECTION_NAME || 'knowledge_base';

async function searchChunks(queryVector, roleId) {
    const must = [{ key: 'metadata.accessibleByRoles', match: { value: roleId } }];

    return qdrantClient.search(COLLECTION, {
        vector: queryVector,
        filter: { must },
        limit: 5,
        with_payload: true
    });
}

module.exports = { searchChunks };
