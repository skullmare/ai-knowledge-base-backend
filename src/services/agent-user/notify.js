const { getBot: getTelegramBot } = require('../telegram/bot');
const { getBot: getMaxBot } = require('../max/bot');
const logger = require('../../utils/logger');

const ACCESS_GRANTED_TEXT = 'Вам предоставлен доступ к ИИ-агенту. Напишите сообщение, чтобы начать.';

// Уведомление — побочный эффект: падение мессенджера не должно
// проваливать запрос администратора, который выдал доступ.
const safeSend = async (label, send) => {
    try {
        await send();
    } catch (error) {
        logger.error(`[Notify] Не удалось уведомить пользователя (${label})`, null, error.message);
    }
};

const notifyAccessGranted = async (agentUser) => {
    const telegramBot = getTelegramBot();
    const maxBot = getMaxBot();

    if (agentUser.chatIdTG && telegramBot) {
        await safeSend('telegram', () => telegramBot.sendMessage(agentUser.chatIdTG, ACCESS_GRANTED_TEXT));
    }

    if (agentUser.chatIdMAX && maxBot) {
        await safeSend('max', () => maxBot.sendMessageToUser(agentUser.chatIdMAX, ACCESS_GRANTED_TEXT));
    }
};

module.exports = { notifyAccessGranted, ACCESS_GRANTED_TEXT };
