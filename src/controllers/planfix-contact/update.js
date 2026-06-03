const AgentRole = require('../../models/agent-role');
const { syncTopicToQdrant } = require('../../services/qdrant/sync-chunk');
const sendError = require('../../utils/error-handler');
const sendSuccess = require('../../utils/success-handler');

module.exports = async (req, res) => {
    const { id } = req.params;
    const { fullName, company, email, phone, info } = req.body || {};

    const operatorRole = await AgentRole.findOne({ name: 'Оператор' });
    if (!operatorRole) {
        return sendError(res, 500, 'Системная роль "Оператор" не найдена');
    }

    const lines = [];
    if (fullName) lines.push(`ФИО: ${fullName}`);
    if (company)  lines.push(`Компания: ${company}`);
    if (email)    lines.push(`Email: ${email}`);
    if (phone)    lines.push(`Телефон: ${phone}`);
    if (info)     lines.push(`Информация: ${info}`);

    const markdownContent = lines.join('\n');
    const topicId = `contact_id:${id}`;

    try {
        await syncTopicToQdrant({
            _id: topicId,
            name: fullName || `Контакт ${id}`,
            markdownContent,
            metadata: {
                category: { name: 'Контакты' },
                accessibleByRoles: [{ _id: operatorRole._id }]
            }
        });
    } catch (err) {
        return sendError(res, 500, 'Ошибка при обновлении контакта в базе знаний', [err.message]);
    }

    return sendSuccess(res, 200, 'Контакт успешно обновлён в базе знаний', { id });
};
