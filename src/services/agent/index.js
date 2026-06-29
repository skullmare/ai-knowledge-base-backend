const TopicCategory = require('../../models/topic-category');
const Topic = require('../../models/topic');
const Message = require('../../models/message');
const { getEmbeddings } = require('../openrouter/get-embeddings');
const { classifyCategory } = require('./classify');
const { searchChunks } = require('./search');
const { generateResponse } = require('./respond');
const logger = require('../../utils/logger');

const HISTORY_LIMIT = 10;

async function processMessage(agentUser, userMessage) {
    const { _id: agentUserId } = agentUser;
    const roleId = (agentUser.role._id ?? agentUser.role).toString();

    let embeddings;
    try {
        embeddings = await getEmbeddings([userMessage]);
    } catch (err) {
        logger.error('[Agent] Ошибка получения эмбеддингов (OpenRouter)', null, err.message);
        throw err;
    }

    const [embedding] = embeddings;

    const usedCategoryIds = await Topic.distinct('metadata.category');
    const categories = await TopicCategory.find({ _id: { $in: usedCategoryIds } }).lean();

    const categoryName = await classifyCategory(userMessage, categories);

    let chunks;
    try {
        chunks = await searchChunks(embedding.embedding, categoryName, roleId);
    } catch (err) {
        logger.error('[Agent] Ошибка поиска в Qdrant', null, err.message);
        throw err;
    }

    const history = await Message.find({ agentUserId })
        .sort({ createdAt: -1 })
        .limit(HISTORY_LIMIT)
        .lean()
        .then(msgs => msgs.reverse());

    await Message.create({ agentUserId, role: 'user', content: userMessage, category: categoryName });

    let responseAgent;
    try {
        responseAgent = await generateResponse(userMessage, chunks, history);
    } catch (err) {
        logger.error('[Agent] Ошибка генерации ответа (OpenRouter chat)', null, err.message);
        throw err;
    }

    await Message.create({ agentUserId, role: 'assistant', content: responseAgent, category: categoryName });

    return responseAgent;
}

module.exports = { processMessage };
