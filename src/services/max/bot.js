const logger = require('../../utils/logger');
const { create, get } = require('../../../config/max');
const { onMessage, onCallback } = require('./handlers');

function initMaxBot() {
    const { MAX_BOT_TOKEN } = process.env;
    if (!MAX_BOT_TOKEN) {
        logger.error('[MaxBot] MAX_BOT_TOKEN не задан, бот не запущен');
        return;
    }

    const bot = create(MAX_BOT_TOKEN);

    bot.on('message_created', async (ctx) => {
        try {
            await onMessage(ctx);
        } catch (err) {
            const detail = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
            logger.error('[MaxBot] Ошибка обработки обновления', null, detail);
        }
    });

    bot.on('message_callback', async (ctx) => {
        try {
            await onCallback(ctx);
        } catch (err) {
            const detail = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
            logger.error('[MaxBot] Ошибка обработки обновления', null, detail);
        }
    });

    bot.start().catch(err => logger.error('[MaxBot] Критическая ошибка polling', null, err.message));
    logger.success('[MaxBot] Бот запущен');
}

module.exports = { initMaxBot, getBot: get };
