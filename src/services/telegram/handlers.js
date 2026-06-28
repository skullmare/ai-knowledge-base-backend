const AgentUser = require('../../models/agent-user');
const { processMessage } = require('../agent');
const kb = require('./keyboards');
const { get: getBot } = require('../../../config/telegram');

async function onMessage(msg) {
    const chatIdTG = String(msg.chat.id);
    const bot = getBot();

    if (msg.text === '/start') {
        const user = await AgentUser.findOne({ chatIdTG }).populate('role');
        if (!user)      return bot.sendMessage(chatIdTG, 'Добро пожаловать! Чтобы получить доступ к ИИ-агенту, поделитесь своим номером телефона.', kb.phoneRequest);
        if (!user.role) return bot.sendMessage(chatIdTG, 'У вас пока что нет прав доступа, дождитесь когда вам разрешат использовать ИИ агента.', kb.remove);
        return bot.sendMessage(chatIdTG, 'Вы можете использовать ИИ-агента. Напишите ваш вопрос.', kb.remove);
    }

    const user = await AgentUser.findOne({ chatIdTG }).populate('role');

    if (!user)      return bot.sendMessage(chatIdTG, 'Чтобы получить доступ к ИИ-агенту, поделитесь своим номером телефона.', kb.phoneRequest);
    if (!user.role) return bot.sendMessage(chatIdTG, 'У вас пока что нет прав доступа, дождитесь когда вам разрешат использовать ИИ агента.');

    await AgentUser.findByIdAndUpdate(user._id, { lastActivity: new Date(), $inc: { requestsCount: 1 } });
    await bot.sendChatAction(chatIdTG, 'typing');
    return bot.sendMessage(chatIdTG, await processMessage(user, msg.text));
}

async function onContact(msg) {
    const chatIdTG = String(msg.chat.id);
    const bot = getBot();
    const { contact } = msg;

    if (String(contact.user_id) !== String(msg.from.id))
        return bot.sendMessage(chatIdTG, 'Пожалуйста, поделитесь своим собственным номером телефона.', kb.phoneRequest);

    const existing = await AgentUser.findOne({ $or: [{ chatIdTG }, { phone: contact.phone_number }] });
    if (existing) {
        if (!existing.chatIdTG) {
            await AgentUser.findByIdAndUpdate(existing._id, { chatIdTG });
        }
        const text = existing.role
            ? 'Вы уже зарегистрированы и можете использовать ИИ-агента.'
            : 'Вы уже зарегистрированы. Дождитесь когда вам разрешат использовать ИИ агента.';
        return bot.sendMessage(chatIdTG, text, kb.remove);
    }

    await AgentUser.create({
        chatIdTG,
        phone: contact.phone_number,
        firstName: contact.first_name || msg.from.first_name,
        lastName: contact.last_name || msg.from.last_name || ''
    });

    return bot.sendMessage(chatIdTG, 'Спасибо! Вы успешно зарегистрированы. Дождитесь когда администратор предоставит вам доступ к ИИ-агенту.', kb.remove);
}

module.exports = { onMessage, onContact };
