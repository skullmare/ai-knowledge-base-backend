const logger = require('../../utils/logger');
const { create, get } = require('../../../config/max');
const { onMessage, onCallback } = require('./handlers');

function schedulePolling(bot, delay = 0) {
    setTimeout(() => poll(bot, 3000), delay);
}

async function poll(bot, retryDelay) {
    try {
        const updates = await bot.getUpdates(25);
        for (const update of updates) {
            try {
                logger.debug('[MaxBot] update', JSON.stringify(update));
                if (update.update_type === 'message_created') {
                    await onMessage(update.message, bot);
                } else if (update.update_type === 'message_callback') {
                    await onCallback(update.callback, bot);
                }
            } catch (err) {
                const detail = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
                logger.error('[MaxBot] Ошибка обработки обновления', null, detail);
            }
        }
        schedulePolling(bot, updates.length === 0 ? 1000 : 0);
    } catch (err) {
        const status = err?.response?.status;
        if (status === 429) {
            const retryAfter = err?.response?.headers?.['retry-after'];
            const wait = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay;
            logger.error(`[MaxBot] Ошибка получения обновлений [${err.message}], повтор через ${wait / 1000}с`);
            schedulePolling(bot, wait);
        } else {
            logger.error('[MaxBot] Ошибка получения обновлений', null, err.message);
            schedulePolling(bot, retryDelay);
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
    schedulePolling(bot);
    logger.success('[MaxBot] Бот запущен');
}

module.exports = { initMaxBot, getBot: get };
