const AgentUser = require('../../models/agent-user');
const { processMessage } = require('../agent');
const { registerAgentUser } = require('../agent-user/register');
const logger = require('../../utils/logger');
const kb = require('./keyboards');

function extractPhoneFromVcf(vcf) {
    const match = vcf.match(/TEL[^:]*:(\+?\d+)/);
    return match ? (match[1].startsWith('+') ? match[1] : '+' + match[1]) : null;
}

async function register({ bot, chatId, chatIdMAX, phone, name }) {
    const nameParts = (name || '').trim().split(' ');

    let result;
    try {
        result = await registerAgentUser({
            field: 'chatIdMAX',
            chatId: chatIdMAX,
            phone,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || ''
        });
    } catch (err) {
        logger.error('[MaxBot] Ошибка регистрации пользователя', null, err.message);
        return bot.sendMessageToChat(chatId, 'Не удалось завершить регистрацию. Попробуйте ещё раз позже или обратитесь к администратору.');
    }

    if (result.status === 'invalid')
        return bot.sendMessageToChat(chatId, 'Не удалось определить ваш номер телефона. Попробуйте поделиться контактом ещё раз.', [kb.phoneRequest]);

    if (result.status === 'created')
        return bot.sendMessageToChat(chatId, 'Спасибо! Вы успешно зарегистрированы. Дождитесь когда администратор предоставит вам доступ к ИИ-агенту.');

    const text = result.user.role
        ? 'Вы уже зарегистрированы и можете использовать ИИ-агента.'
        : 'Вы уже зарегистрированы. Дождитесь когда вам разрешат использовать ИИ агента.';
    return bot.sendMessageToChat(chatId, text);
}

async function onMessage(message, bot) {
    const userId = message.sender.user_id;
    const chatIdMAX = String(userId);
    const chatId = message.recipient.chat_id;
    const text = message.body?.text || '';

    const contactAttachment = message.body?.attachments?.find(a => a.type === 'contact');
    if (contactAttachment) {
        const vcf = contactAttachment.payload?.vcf_info || '';
        const phone = extractPhoneFromVcf(vcf);
        if (phone) {
            return register({ bot, chatId, chatIdMAX, phone, name: message.sender.name });
        }
    }

    if (text === '/start') {
        const user = await AgentUser.findOne({ chatIdMAX }).populate('role');
        if (!user)      return bot.sendMessageToChat(chatId, 'Добро пожаловать! Чтобы получить доступ к ИИ-агенту, поделитесь своим номером телефона.', [kb.phoneRequest]);
        if (!user.role) return bot.sendMessageToChat(chatId, 'У вас пока что нет прав доступа, дождитесь когда вам разрешат использовать ИИ агента.');
        return bot.sendMessageToChat(chatId, 'Вы можете использовать ИИ-агента. Напишите ваш вопрос.');
    }

    const user = await AgentUser.findOne({ chatIdMAX }).populate('role');

    if (!user)                      return bot.sendMessageToChat(chatId, 'Чтобы получить доступ к ИИ-агенту, поделитесь своим номером телефона.', [kb.phoneRequest]);
    if (user.status === 'blocked')  return bot.sendMessageToChat(chatId, 'Ваш аккаунт заблокирован. Обратитесь к администратору.');
    if (!user.role)                 return bot.sendMessageToChat(chatId, 'У вас пока что нет прав доступа, дождитесь когда вам разрешат использовать ИИ агента.');

    await AgentUser.findByIdAndUpdate(user._id, { lastActivity: new Date(), $inc: { requestsCount: 1 } });
    await bot.sendTyping(chatId);
    try {
        const response = await processMessage(user, text);
        return bot.sendMessageToChat(chatId, response);
    } catch (err) {
        logger.error('[MaxBot] Ошибка обработки запроса пользователя', null, err.message);
        return bot.sendMessageToChat(chatId, 'Произошла ошибка при обработке вашего запроса. Попробуйте ещё раз позже.');
    }
}

async function onCallback(callback, bot) {
    const userId = callback.user.user_id;
    const chatIdMAX = String(userId);
    const chatId = callback.message?.recipient?.chat_id || userId;
    const phone = callback.payload;

    if (!phone || !String(phone).startsWith('+')) return;

    return register({ bot, chatId, chatIdMAX, phone: String(phone), name: callback.user.name });
}

module.exports = { onMessage, onCallback };
