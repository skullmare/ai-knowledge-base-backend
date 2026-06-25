const AgentUser = require('../../models/agent-user');
const { processMessage } = require('../agent');
const kb = require('./keyboards');

async function onMessage(ctx) {
    const userId = ctx.user.user_id;
    const chatId = ctx.message.recipient.chat_id;
    const text = ctx.message.body?.text || '';

    if (text === '/start') {
        const user = await AgentUser.findOne({ chatId: String(userId), messenger: 'max' }).populate('role');
        if (!user)      return ctx.api.sendMessageToChat(chatId, 'Добро пожаловать! Чтобы получить доступ к ИИ-агенту, поделитесь своим номером телефона.', { attachments: [kb.phoneRequest] });
        if (!user.role) return ctx.api.sendMessageToChat(chatId, 'У вас пока что нет прав доступа, дождитесь когда вам разрешат использовать ИИ агента.');
        return ctx.api.sendMessageToChat(chatId, 'Вы можете использовать ИИ-агента. Напишите ваш вопрос.');
    }

    const user = await AgentUser.findOne({ chatId: String(userId), messenger: 'max' }).populate('role');

    if (!user)      return ctx.api.sendMessageToChat(chatId, 'Чтобы получить доступ к ИИ-агенту, поделитесь своим номером телефона.', { attachments: [kb.phoneRequest] });
    if (!user.role) return ctx.api.sendMessageToChat(chatId, 'У вас пока что нет прав доступа, дождитесь когда вам разрешат использовать ИИ агента.');

    await AgentUser.findByIdAndUpdate(user._id, { lastActivity: new Date(), $inc: { requestsCount: 1 } });
    return ctx.api.sendMessageToChat(chatId, await processMessage(user, text));
}

async function onCallback(ctx) {
    const userId = ctx.user.user_id;
    const chatId = ctx.callback.message?.recipient?.chat_id || userId;
    const phone = ctx.callback.payload;

    if (!phone || !String(phone).startsWith('+')) return;

    const existing = await AgentUser.findOne({ chatId: String(userId), messenger: 'max' });
    if (existing) {
        const text = existing.role
            ? 'Вы уже зарегистрированы и можете использовать ИИ-агента.'
            : 'Вы уже зарегистрированы. Дождитесь когда вам разрешат использовать ИИ агента.';
        return ctx.api.sendMessageToChat(chatId, text);
    }

    const nameParts = (ctx.user.name || '').trim().split(' ');
    await AgentUser.create({
        chatId: String(userId),
        messenger: 'max',
        phone: String(phone),
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || ''
    });

    return ctx.api.sendMessageToChat(chatId, 'Спасибо! Вы успешно зарегистрированы. Дождитесь когда администратор предоставит вам доступ к ИИ-агенту.');
}

module.exports = { onMessage, onCallback };
