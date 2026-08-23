const AgentUser = require('../../models/agent-user');
const { processMessage } = require('../agent');
const { registerAgentUser } = require('../agent-user/register');
const logger = require('../../utils/logger');
const kb = require('./keyboards');

// Бот приходит параметром (как в MAX-хендлерах): скрытый доступ к глобальному
// инстансу делал модуль непроверяемым и падал, если бот не инициализирован.
async function onMessage(msg, bot) {
    const chatIdTG = String(msg.chat.id);

    if (msg.text === '/start') {
        const user = await AgentUser.findOne({ chatIdTG }).populate('role');
        if (!user)      return bot.sendMessage(chatIdTG, 'Добро пожаловать! Чтобы получить доступ к ИИ-агенту, поделитесь своим номером телефона.', kb.phoneRequest);
        if (!user.role) return bot.sendMessage(chatIdTG, 'У вас пока что нет прав доступа, дождитесь когда вам разрешат использовать ИИ агента.', kb.remove);
        return bot.sendMessage(chatIdTG, 'Вы можете использовать ИИ-агента. Напишите ваш вопрос.', kb.remove);
    }

    const user = await AgentUser.findOne({ chatIdTG }).populate('role');

    if (!user)                      return bot.sendMessage(chatIdTG, 'Чтобы получить доступ к ИИ-агенту, поделитесь своим номером телефона.', kb.phoneRequest);
    if (user.status === 'blocked')  return bot.sendMessage(chatIdTG, 'Ваш аккаунт заблокирован. Обратитесь к администратору.');
    if (!user.role)                 return bot.sendMessage(chatIdTG, 'У вас пока что нет прав доступа, дождитесь когда вам разрешат использовать ИИ агента.');

    await AgentUser.findByIdAndUpdate(user._id, { lastActivity: new Date(), $inc: { requestsCount: 1 } });
    await bot.sendChatAction(chatIdTG, 'typing');
    try {
        const response = await processMessage(user, msg.text);
        return bot.sendMessage(chatIdTG, response);
    } catch (err) {
        logger.error('[TelegramBot] Ошибка обработки запроса пользователя', null, err.message);
        return bot.sendMessage(chatIdTG, 'Произошла ошибка при обработке вашего запроса. Попробуйте ещё раз позже.');
    }
}

async function onContact(msg, bot) {
    const chatIdTG = String(msg.chat.id);
    const { contact } = msg;

    if (String(contact.user_id) !== String(msg.from.id))
        return bot.sendMessage(chatIdTG, 'Пожалуйста, поделитесь своим собственным номером телефона.', kb.phoneRequest);

    let result;
    try {
        result = await registerAgentUser({
            field: 'chatIdTG',
            chatId: chatIdTG,
            phone: contact.phone_number,
            firstName: contact.first_name || msg.from.first_name,
            lastName: contact.last_name || msg.from.last_name || ''
        });
    } catch (err) {
        logger.error('[TelegramBot] Ошибка регистрации пользователя', null, err.message);
        return bot.sendMessage(chatIdTG, 'Не удалось завершить регистрацию. Попробуйте ещё раз позже или обратитесь к администратору.', kb.remove);
    }

    if (result.status === 'invalid')
        return bot.sendMessage(chatIdTG, 'Не удалось определить ваш номер телефона. Попробуйте поделиться контактом ещё раз.', kb.phoneRequest);

    if (result.status === 'created')
        return bot.sendMessage(chatIdTG, 'Спасибо! Вы успешно зарегистрированы. Дождитесь когда администратор предоставит вам доступ к ИИ-агенту.', kb.remove);

    const text = result.user.role
        ? 'Вы уже зарегистрированы и можете использовать ИИ-агента.'
        : 'Вы уже зарегистрированы. Дождитесь когда вам разрешат использовать ИИ агента.';
    return bot.sendMessage(chatIdTG, text, kb.remove);
}

module.exports = { onMessage, onContact };
