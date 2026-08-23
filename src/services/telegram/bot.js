const logger = require('../../utils/logger');
const { create, get } = require('../../../config/telegram');
const { onMessage, onContact } = require('./handlers');

function initBot() {
    const { TG_BOT_TOKEN } = process.env;
    if (!TG_BOT_TOKEN) {
        logger.error('[TelegramBot] TG_BOT_TOKEN не задан, бот не запущен');
        return;
    }

    const bot = create(TG_BOT_TOKEN);

    bot.on('message', async (msg) => {
        try {
            await (msg.contact ? onContact(msg) : onMessage(msg));
        } catch (err) {
            logger.error('[TelegramBot] Ошибка обработки сообщения', null, err.message);
        }
    });

    bot.on('polling_error', (err) => logger.error('[TelegramBot] Ошибка polling', null, err.message));

    logger.success('[TelegramBot] Бот запущен');
}

module.exports = { initBot, getBot: get };
