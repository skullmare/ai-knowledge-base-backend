const logger = require('../../utils/logger');
const { create, get } = require('../../../config/max');
const { onMessage, onCallback } = require('./handlers');

async function startPolling(bot) {
    let retryDelay = 3000;

    while (true) {
        try {
            const updates = await bot.getUpdates(25);
            retryDelay = 3000;
            for (const update of updates) {
                try {
                    if (update.update_type === 'message_created') {
                        await onMessage(update.message);
                    } else if (update.update_type === 'message_callback') {
                        await onCallback(update.callback);
                    }
                } catch (err) {
                    logger.error('[MaxBot] Ошибка обработки обновления', null, err.message);
                }
            }
        } catch (err) {
            const status = err?.response?.status;
            if (status === 429) {
                const retryAfter = err?.response?.headers?.['retry-after'];
                const wait = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay;
                logger.error(`[MaxBot] Ошибка получения обновлений [${err.message}], повтор через ${wait / 1000}с`);
                await new Promise(r => setTimeout(r, wait));
                retryDelay = Math.min(retryDelay * 2, 60000);
            } else {
                logger.error('[MaxBot] Ошибка получения обновлений', null, err.message);
                await new Promise(r => setTimeout(r, retryDelay));
            }
        }
    }
}

function initMaxBot() {
    const { MAX_BOT_TOKEN } = process.env;
    if (!MAX_BOT_TOKEN) {
        logger.error('[MaxBot] MAX_BOT_TOKEN не задан, бот не запущен');
        return;
    }

    const bot = create(MAX_BOT_TOKEN);
    startPolling(bot).catch(err => logger.error('[MaxBot] Критическая ошибка polling', null, err.message));
    logger.success('[MaxBot] Бот запущен');
}

module.exports = { initMaxBot, getBot: get };
