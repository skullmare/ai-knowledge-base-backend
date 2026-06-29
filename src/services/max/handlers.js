const AgentUser = require('../../models/agent-user');
const { processMessage } = require('../agent');
const kb = require('./keyboards');

function extractPhoneFromVcf(vcf) {
    const match = vcf.match(/TEL[^:]*:(\+?\d+)/);
    return match ? (match[1].startsWith('+') ? match[1] : '+' + match[1]) : null;
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
            const existing = await AgentUser.findOne({ $or: [{ chatIdMAX }, { phone }] });
            if (existing) {
                if (!existing.chatIdMAX) {
                    await AgentUser.findByIdAndUpdate(existing._id, { chatIdMAX });
                }
                const text = existing.role
                    ? 'Вы уже зарегистрированы и можете использовать ИИ-агента.'
                    : 'Вы уже зарегистрированы. Дождитесь когда вам разрешат использовать ИИ агента.';
                return bot.sendMessageToChat(chatId, text);
            }
            const nameParts = (message.sender.name || '').trim().split(' ');
            await AgentUser.create({
                chatIdMAX,
                phone,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || ''
            });
            return bot.sendMessageToChat(chatId, 'Спасибо! Вы успешно зарегистрированы. Дождитесь когда администратор предоставит вам доступ к ИИ-агенту.');
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
        const { messageText, fileUrls } = await processMessage(user, text);

        let attachments = [];
        if (fileUrls.length > 0) {
            const results = await Promise.allSettled(fileUrls.map(url => bot.uploadFileFromUrl(url)));
            attachments = results
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value);
        }

        return bot.sendMessageToChat(chatId, messageText, attachments);
    } catch (err) {
        return bot.sendMessageToChat(chatId, 'Произошла ошибка при обработке вашего запроса. Попробуйте ещё раз позже.');
    }
}

async function onCallback(callback, bot) {
    const userId = callback.user.user_id;
    const chatIdMAX = String(userId);
    const chatId = callback.message?.recipient?.chat_id || userId;
    const phone = callback.payload;

    if (!phone || !String(phone).startsWith('+')) return;

    const existing = await AgentUser.findOne({ $or: [{ chatIdMAX }, { phone: String(phone) }] });
    if (existing) {
        if (!existing.chatIdMAX) {
            await AgentUser.findByIdAndUpdate(existing._id, { chatIdMAX });
        }
        const text = existing.role
            ? 'Вы уже зарегистрированы и можете использовать ИИ-агента.'
            : 'Вы уже зарегистрированы. Дождитесь когда вам разрешат использовать ИИ агента.';
        return bot.sendMessageToChat(chatId, text);
    }

    const nameParts = (callback.user.name || '').trim().split(' ');
    await AgentUser.create({
        chatIdMAX,
        phone: String(phone),
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || ''
    });

    return bot.sendMessageToChat(chatId, 'Спасибо! Вы успешно зарегистрированы. Дождитесь когда администратор предоставит вам доступ к ИИ-агенту.');
}

module.exports = { onMessage, onCallback };
