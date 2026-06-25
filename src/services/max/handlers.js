const AgentUser = require('../../models/agent-user');
const { processMessage } = require('../agent');
const kb = require('./keyboards');
const { get: getBot } = require('../../../config/max');

async function onMessage(message) {
    const logger = require('../../utils/logger');
    logger.info('[MaxBot] incoming message: ' + JSON.stringify(message));
    const userId = message.sender.user_id;
    const text = message.body?.text || '';
    const bot = getBot();

    if (text === '/start') {
        const user = await AgentUser.findOne({ chatId: String(userId), messenger: 'max' }).populate('role');
        if (!user)      return bot.sendMessage(userId, 'Добро пожаловать! Чтобы получить доступ к ИИ-агенту, поделитесь своим номером телефона.', [kb.phoneRequest]);
        if (!user.role) return bot.sendMessage(userId, 'У вас пока что нет прав доступа, дождитесь когда вам разрешат использовать ИИ агента.');
        return bot.sendMessage(userId, 'Вы можете использовать ИИ-агента. Напишите ваш вопрос.');
    }

    const user = await AgentUser.findOne({ chatId: String(userId), messenger: 'max' }).populate('role');

    if (!user)      return bot.sendMessage(userId, 'Чтобы получить доступ к ИИ-агенту, поделитесь своим номером телефона.', [kb.phoneRequest]);
    if (!user.role) return bot.sendMessage(userId, 'У вас пока что нет прав доступа, дождитесь когда вам разрешат использовать ИИ агента.');

    await AgentUser.findByIdAndUpdate(user._id, { lastActivity: new Date(), $inc: { requestsCount: 1 } });
    await bot.sendTyping(userId);
    return bot.sendMessage(userId, await processMessage(user, text));
}

async function onCallback(callback) {
    const userId = callback.user.user_id;
    const bot = getBot();
    const phone = callback.payload;

    if (!phone || !String(phone).startsWith('+')) return;

    const existing = await AgentUser.findOne({ chatId: String(userId), messenger: 'max' });
    if (existing) {
        const text = existing.role
            ? 'Вы уже зарегистрированы и можете использовать ИИ-агента.'
            : 'Вы уже зарегистрированы. Дождитесь когда вам разрешат использовать ИИ агента.';
        return bot.sendMessage(userId, text);
    }

    const nameParts = (callback.user.name || '').trim().split(' ');
    await AgentUser.create({
        chatId: String(userId),
        messenger: 'max',
        phone: String(phone),
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || ''
    });

    return bot.sendMessage(userId, 'Спасибо! Вы успешно зарегистрированы. Дождитесь когда администратор предоставит вам доступ к ИИ-агенту.');
}

module.exports = { onMessage, onCallback };
