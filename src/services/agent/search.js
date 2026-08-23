const { qdrantClient } = require('../../../config/qdrant');
const { getNumberSetting } = require('../settings');

const COLLECTION = process.env.COLLECTION_NAME || 'knowledge_base';

async function searchChunks(queryVector, roleId) {
    const must = [{ key: 'metadata.accessibleByRoles', match: { value: roleId } }];
    const limit = await getNumberSetting('agent_search_limit', 5);

    return qdrantClient.search(COLLECTION, {
        vector: queryVector,
        filter: { must },
        limit,
        with_payload: true
    });
}

module.exports = { searchChunks };
