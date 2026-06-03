const AgentRole = require('../../models/agent-role');
const { syncTopicToQdrant } = require('../../services/qdrant/sync-chunk');
const sendError = require('../../utils/error-handler');
const sendSuccess = require('../../utils/success-handler');

module.exports = async (req, res) => {
    const { fullName, company, email, phone, info, id } = req.body || {};

    if (!id) {
        return sendError(res, 400, 'Поле id обязательно');
    }

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
        return sendError(res, 500, 'Ошибка при сохранении контакта в базу знаний', [err.message]);
    }

    return sendSuccess(res, 201, 'Контакт успешно добавлен в базу знаний', { id });
};
