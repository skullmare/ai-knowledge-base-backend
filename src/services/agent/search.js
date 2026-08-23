const { qdrantClient, collectionName } = require('../../../config/qdrant');

const SEARCH_LIMIT = 5;

async function searchChunks(queryVector, roleId) {
    return qdrantClient.search(collectionName, {
        vector: queryVector,
        filter: { must: [{ key: 'metadata.accessibleByRoles', match: { value: String(roleId) } }] },
        limit: SEARCH_LIMIT,
        with_payload: true
    });
}

module.exports = { searchChunks };
