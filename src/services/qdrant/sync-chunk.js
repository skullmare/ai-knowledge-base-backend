const crypto = require('crypto');
const { qdrantClient } = require('../../../config/qdrant');
const { deleteTopicFromQdrant } = require('./delete-chunk');
const { getMarkdownChunks } = require('../chunker/markdown-chunker');
const { getEmbeddings } = require('../ai/get-embeddings');

const COLLECTION = process.env.COLLECTION_NAME || 'knowledge_base';

async function syncTopicToQdrant(topic) {
    const topicId = topic._id.toString();
    
    await deleteTopicFromQdrant(topicId);

    let content = `# ${topic.name}\n\n${topic.markdownContent}`;

    const chunks = await getMarkdownChunks(content);
    const embeddings = await getEmbeddings(chunks);

    const points = embeddings.map((item, i) => ({
        id: crypto.randomUUID(),
        vector: item.embedding,
        payload: {
            text: chunks[i],
            metadata: {
                source: 'topic',
                topicId,
                name: topic.name,
                category: topic.metadata.category?.name?.toString(),
                accessibleByRoles: (topic.metadata.accessibleByRoles || []).map(r => r._id.toString())
            }
        }
    }));

    return qdrantClient.upsert(COLLECTION, { wait: true, points });
}

module.exports = { syncTopicToQdrant };
