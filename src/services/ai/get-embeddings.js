const { getAIClient } = require('./client');
const { getSetting } = require('../settings');

// Провайдеры ограничивают размер батча — режем вход на порции
const BATCH_SIZE = 64;

/**
 * @param {string[]} chunks
 * @returns {Promise<Array<{ embedding: number[], index: number }>>}
 */
async function getEmbeddings(chunks) {
    if (!chunks?.length) return [];

    const client = await getAIClient();
    const model = await getSetting('ai_embedding_model');

    const result = [];

    for (let offset = 0; offset < chunks.length; offset += BATCH_SIZE) {
        const batch = chunks.slice(offset, offset + BATCH_SIZE);

        const response = await client.embeddings.create({
            model,
            input: batch,
            encoding_format: 'float',
        });

        const sorted = [...response.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
        sorted.forEach((item, i) => {
            result.push({ embedding: item.embedding, index: offset + i });
        });
    }

    return result;
}

module.exports = { getEmbeddings };
