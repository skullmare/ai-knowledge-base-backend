const TopicCategory = require('../../models/topic-category');
const Topic = require('../../models/topic');
const Message = require('../../models/message');
const { getEmbeddings } = require('../openrouter/get-embeddings');
const { classifyCategory } = require('./classify');
const { searchChunks } = require('./search');
const { generateResponse } = require('./respond');

const HISTORY_LIMIT = 10;

async function processMessage(agentUser, userMessage) {
    const { _id: agentUserId } = agentUser;
    const roleId = (agentUser.role._id ?? agentUser.role).toString();

    const [[embedding], usedCategoryIds] = await Promise.all([
        getEmbeddings([userMessage]),
        Topic.distinct('metadata.category')
    ]);

    const categories = await TopicCategory.find({ _id: { $in: usedCategoryIds } }).lean();

    const categoryName = await classifyCategory(userMessage, categories);
    const chunks = await searchChunks(embedding.embedding, categoryName, roleId);

    const history = await Message.find({ agentUserId })
        .sort({ createdAt: -1 })
        .limit(HISTORY_LIMIT)
        .lean()
        .then(msgs => msgs.reverse());

    await Message.create({ agentUserId, role: 'user', content: userMessage, category: categoryName });

    const responseAgent = await generateResponse(userMessage, chunks, history);

    await Message.create({ agentUserId, role: 'assistant', content: responseAgent, category: categoryName });

//     const responseText = `Категория запроса: ${categoryName}.
// Ваша роль: ${agentUser.role.name}
// =============
// Количество чанков: ${chunks.length}
// Чанки: 
// ${chunks.map((h, i) => `[${i + 1}] ${h.payload.text}`).join('\n\n')}
// =============
// Ответ на запрос: ${responseAgent}`;

    const responseText = responseAgent;

    return responseText;
}

module.exports = { processMessage };
