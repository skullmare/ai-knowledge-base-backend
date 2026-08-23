const { getAIClient } = require('./client');
const { EMBEDDING_MODEL, EMBEDDING_LIMITS } = require('../../constants/ai');

/**
 * Считает эмбеддинги для списка входов.
 * Вход — либо строка, либо мультимодальная запись вида
 * `{ content: [{ type: 'file', file: {...} }] }` (Gemini Embedding 2
 * принимает файлы напрямую, без внешнего разбора документов).
 *
 * @param {Array<string|object>} inputs
 * @param {{ batchSize?: number }} [options]
 * @returns {Promise<Array<{ embedding: number[], index: number }>>}
 */
async function getEmbeddings(inputs, { batchSize = EMBEDDING_LIMITS.TEXT_BATCH } = {}) {
    if (!inputs?.length) return [];

    const client = await getAIClient();
    const result = [];

    for (let offset = 0; offset < inputs.length; offset += batchSize) {
        const batch = inputs.slice(offset, offset + batchSize);

        const response = await client.embeddings.create({
            model: EMBEDDING_MODEL,
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
