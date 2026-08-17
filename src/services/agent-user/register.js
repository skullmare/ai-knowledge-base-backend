const AgentUser = require('../../models/agent-user');

// Telegram отдаёт номер как "79991234567", MAX — как "+79991234567".
// Храним всегда в формате "+<цифры>", а ищем по всем вариантам,
// чтобы находить записи, созданные до нормализации.
const normalizePhone = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits ? `+${digits}` : null;
};

const phoneVariants = (phone) => {
    const raw = String(phone || '').trim();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return [];
    return [...new Set([raw, digits, `+${digits}`])];
};

/**
 * Регистрирует пользователя агента или привязывает мессенджер к уже существующей записи.
 *
 * @returns {Promise<{ status: 'created'|'linked'|'existing'|'invalid', user: object|null }>}
 */
const registerAgentUser = async ({ field, chatId, phone, firstName = '', lastName = '' }) => {
    const variants = phoneVariants(phone);
    if (!variants.length) return { status: 'invalid', user: null };

    const query = { $or: [{ [field]: chatId }, { phone: { $in: variants } }] };

    const existing = await AgentUser.findOne(query);
    if (existing) {
        if (existing[field]) return { status: 'existing', user: existing };

        const linked = await AgentUser.findByIdAndUpdate(
            existing._id,
            { [field]: chatId },
            { returnDocument: 'after' }
        );
        return { status: 'linked', user: linked || existing };
    }

    try {
        const user = await AgentUser.create({
            [field]: chatId,
            phone: normalizePhone(phone),
            firstName,
            lastName
        });
        return { status: 'created', user };
    } catch (error) {
        // Гонка двух сообщений от одного пользователя: запись уже создана параллельно.
        if (error?.code === 11000) {
            const user = await AgentUser.findOne(query);
            if (user) return { status: 'existing', user };
        }
        throw error;
    }
};

module.exports = { registerAgentUser, normalizePhone, phoneVariants };
