const AgentUser = require('../../models/agent-user');
const AgentRole = require('../../models/agent-role');
const { processMessage } = require('../agent');
const kb = require('./keyboards');
const { get: getBot } = require('../../../config/telegram');
const { getPlanfixUserRole } = require('../planfix/get-user-role');

async function onMessage(msg) {
    const chatId = String(msg.chat.id);
    const bot = getBot();

    if (msg.text === '/start') {
        const user = await AgentUser.findOne({ chatId }).populate('role');
        if (!user)      return bot.sendMessage(chatId, 'Добро пожаловать! Чтобы получить доступ к ИИ-агенту, поделитесь своим номером телефона.', kb.phoneRequest);
        if (!user.role) return bot.sendMessage(chatId, 'У вас пока что нет прав доступа, дождитесь когда вам разрешат использовать ИИ агента.', kb.remove);
        return bot.sendMessage(chatId, 'Вы можете использовать ИИ-агента. Напишите ваш вопрос.', kb.remove);
    }

    const user = await AgentUser.findOne({ chatId }).populate('role');

    if (!user)      return bot.sendMessage(chatId, 'Чтобы получить доступ к ИИ-агенту, поделитесь своим номером телефона.', kb.phoneRequest);
    if (!user.role) return bot.sendMessage(chatId, 'У вас пока что нет прав доступа, дождитесь когда вам разрешат использовать ИИ агента.');

    await AgentUser.findByIdAndUpdate(user._id, { lastActivity: new Date(), $inc: { requestsCount: 1 } });
    await bot.sendChatAction(chatId, 'typing');
    return bot.sendMessage(chatId, await processMessage(user, msg.text));
}

async function onContact(msg) {
    const chatId = String(msg.chat.id);
    const bot = getBot();
    const { contact } = msg;

    if (String(contact.user_id) !== String(msg.from.id))
        return bot.sendMessage(chatId, 'Пожалуйста, поделитесь своим собственным номером телефона.', kb.phoneRequest);

    const existing = await AgentUser.findOne({ chatId });
    if (existing) {
        const text = existing.role
            ? 'Вы уже зарегистрированы и можете использовать ИИ-агента.'
            : 'Вы уже зарегистрированы. Дождитесь когда вам разрешат использовать ИИ агента.';
        return bot.sendMessage(chatId, text, kb.remove);
    }

    // Try to resolve role from Planfix by phone number
    const phone = contact.phone_number.startsWith('+') ? contact.phone_number : `+${contact.phone_number}`;
    const planfixRoleName = await getPlanfixUserRole(phone);
    let roleId = null;
    if (planfixRoleName) {
        const role = await AgentRole.findOne({ name: planfixRoleName });
        if (role) roleId = role._id;
    }

    await AgentUser.create({
        chatId,
        messenger: 'telegram',
        phone: contact.phone_number,
        firstName: contact.first_name || msg.from.first_name,
        lastName: contact.last_name || msg.from.last_name || '',
        ...(roleId && { role: roleId, status: 'active' })
    });

    const confirmText = roleId
        ? 'Спасибо! Вы успешно зарегистрированы и можете использовать ИИ-агента.'
        : 'Спасибо! Вы успешно зарегистрированы. Дождитесь когда администратор предоставит вам доступ к ИИ-агенту.';

    return bot.sendMessage(chatId, confirmText, kb.remove);
}

module.exports = { onMessage, onContact };
