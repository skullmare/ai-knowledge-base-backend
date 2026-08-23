const Message = require('../../models/message');
const { getEmbeddings } = require('../ai/get-embeddings');
const { rewriteQuery } = require('./rewrite-query');
const { searchChunks } = require('./search');
const { generateResponse } = require('./respond');
const logger = require('../../utils/logger');

const HISTORY_LIMIT = 10;

async function processMessage(agentUser, userMessage) {
    const { _id: agentUserId } = agentUser;
    const roleId = (agentUser.role._id ?? agentUser.role).toString();

    // Load history first — needed by the query rewriter
    const history = await Message.find({ agentUserId })
        .sort({ createdAt: -1 })
        .limit(HISTORY_LIMIT)
        .lean()
        .then(msgs => msgs.reverse());

    // Stage 1: rewrite the user query using conversation context for better vector search recall
    let searchQuery = userMessage;
    try {
        searchQuery = await rewriteQuery(userMessage, history.slice(-5));
        logger.debug(`[Agent] Переформулированный запрос: ${searchQuery}`);
    } catch (err) {
        logger.error('[Agent] Ошибка переформулирования запроса, используем оригинал', null, err.message);
    }

    // Embed the rewritten query
    let embedding;
    try {
        const embeddings = await getEmbeddings([searchQuery]);
        [embedding] = embeddings;
    } catch (err) {
        logger.error('[Agent] Ошибка получения эмбеддингов', null, err.message);
        throw err;
    }

    // Search vector DB with the rewritten query embedding
    let chunks;
    try {
        chunks = await searchChunks(embedding.embedding, roleId);
    } catch (err) {
        logger.error('[Agent] Ошибка поиска в Qdrant', null, err.message);
        throw err;
    }

    await Message.create({ agentUserId, role: 'user', content: userMessage });

    // Stage 2: generate the final response using original question + retrieved context
    let responseAgent;
    try {
        responseAgent = await generateResponse(userMessage, chunks, history);
    } catch (err) {
        logger.error('[Agent] Ошибка генерации ответа', null, err.message);
        throw err;
    }

    await Message.create({ agentUserId, role: 'assistant', content: responseAgent });

    return responseAgent;
}

module.exports = { processMessage };
