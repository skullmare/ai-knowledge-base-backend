const crypto = require('crypto');
const { qdrantClient } = require('../../../config/qdrant');
const { deleteTopicFromQdrant } = require('./delete-chunk');
const { getMarkdownChunks } = require('../chunker/markdown-chunker');
const { getEmbeddings } = require('../openrouter/get-embeddings');
const logger = require('../../utils/logger');

const { COLLECTION_NAME } = process.env;


async function syncTopicToQdrant(topic) {
    const topicId = topic._id.toString();
    
    await deleteTopicFromQdrant(topicId);

    let content = `# ${topic.name}\n\n${topic.markdownContent}`;

    const chunks = await getMarkdownChunks(content);
    logger.info(`[Qdrant sync] chunks: ${chunks.length}`);

    const embeddings = await getEmbeddings(chunks);
    logger.info(`[Qdrant sync] embeddings: ${embeddings.length}`);

    const points = embeddings.map((item, i) => ({
        id: crypto.randomUUID(),
        vector: item.embedding,
        payload: {
            text: chunks[i],
            metadata: {
                topicId,
                name: topic.name,
                category: topic.metadata.category?.name?.toString(),
                accessibleByRoles: (topic.metadata.accessibleByRoles || []).map(r => r._id.toString())
            }
        }
    }));

    return qdrantClient.upsert(COLLECTION_NAME, { wait: true, points });
}

module.exports = { syncTopicToQdrant };