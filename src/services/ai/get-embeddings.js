const { getAIClient } = require('./client');
const { getSetting } = require('../settings');
const { EMBEDDING_MODEL, EMBEDDING_LIMITS } = require('../../constants/ai');

/**
 * Ошибки SDK выглядят как «401 Missing Authentication header» — по такому тексту
 * не понять, какой сервис отказал. Дополняем контекстом: модель, адрес и подсказку.
 */
const describeError = (error, baseURL) => {
    const status = error.status ?? error.response?.status;

    const hint = status === 401
        ? ' Проверьте API-ключ на вкладке «RouterAI» — кнопка «Проверить» покажет, доходит ли он до провайдера.'
        : status === 402
            ? ' Недостаточно средств на балансе RouterAI.'
            : status === 404
                ? ` Модель ${EMBEDDING_MODEL} недоступна по этому ключу или адресу.`
                : status === 429
                    ? ' Превышен лимит запросов к RouterAI.'
                    : '';

    return new Error(
        `RouterAI (${baseURL}, модель ${EMBEDDING_MODEL}) ответил: ${error.message}.${hint}`,
        { cause: error }
    );
};

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
    const baseURL = await getSetting('ai_base_url');
    const result = [];

    for (let offset = 0; offset < inputs.length; offset += batchSize) {
        const batch = inputs.slice(offset, offset + batchSize);

        let response;
        try {
            response = await client.embeddings.create({
                model: EMBEDDING_MODEL,
                input: batch,
                encoding_format: 'float',
            });
        } catch (error) {
            throw describeError(error, baseURL);
        }

        const sorted = [...response.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
        sorted.forEach((item, i) => {
            result.push({ embedding: item.embedding, index: offset + i });
        });
    }

    return result;
}

module.exports = { getEmbeddings };
