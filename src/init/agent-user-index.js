const AgentUser = require('../models/agent-user');
const logger = require('../utils/logger');

// Индексы, оставшиеся от прежней схемы (chatId + messenger).
// chatId_1_messenger_1 был уникальным и НЕ sparse: после перехода на
// chatIdTG/chatIdMAX все новые документы не имеют полей chatId и messenger,
// поэтому второй и последующие пользователи падали с ошибкой E11000
// (дубликат ключа { chatId: null, messenger: null }).
const OBSOLETE_INDEXES = ['chatId_1_messenger_1', 'chatId_1', 'messenger_1'];

const syncAgentUserIndexes = async () => {
    try {
        const collection = AgentUser.collection;
        const existing = await collection.indexes();

        for (const index of existing) {
            if (!OBSOLETE_INDEXES.includes(index.name)) continue;

            await collection.dropIndex(index.name);
            logger.success(`[AgentUser] Удалён устаревший индекс ${index.name}`);
        }

        // Приводит остальные индексы коллекции в соответствие со схемой:
        // пересоздаёт те, чьи опции разошлись (например chatIdTG_1 без unique).
        await AgentUser.syncIndexes();
        logger.success('[AgentUser] Индексы синхронизированы со схемой');
    } catch (error) {
        logger.error('[AgentUser] Ошибка синхронизации индексов', null, error.message || error);
    }
};

module.exports = { syncAgentUserIndexes };
