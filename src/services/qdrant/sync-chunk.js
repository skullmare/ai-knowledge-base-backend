const crypto = require('crypto');
const { qdrantClient, collectionName } = require('../../../config/qdrant');
const { deleteTopicFromQdrant } = require('./delete-chunk');
const { getMarkdownChunks } = require('../chunker/markdown-chunker');
const { getEmbeddings } = require('../openrouter/get-embeddings');

const idOf = (value) => (value?._id ?? value)?.toString();

async function syncTopicToQdrant(topic) {
    const topicId = String(topic._id);

    await deleteTopicFromQdrant(topicId);

    const chunks = await getMarkdownChunks(`# ${topic.name}\n\n${topic.markdownContent || ''}`);
    const embeddings = await getEmbeddings(chunks);

    const points = embeddings.map((item, index) => ({
        id: crypto.randomUUID(),
        vector: item.embedding,
        payload: {
            text: chunks[index],
            metadata: {
                topicId,
                name: topic.name,
                category: idOf(topic.metadata?.category),
                accessibleByRoles: (topic.metadata?.accessibleByRoles || []).map(idOf)
            }
        }
    }));

    return qdrantClient.upsert(collectionName, { wait: true, points });
}

module.exports = { syncTopicToQdrant };
