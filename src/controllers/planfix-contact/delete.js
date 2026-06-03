const { deleteTopicFromQdrant } = require('../../services/qdrant/delete-chunk');
const sendError = require('../../utils/error-handler');
const sendSuccess = require('../../utils/success-handler');

module.exports = async (req, res) => {
    const { id } = req.params;

    const topicId = `contact_id:${id}`;

    try {
        await deleteTopicFromQdrant(topicId);
    } catch (err) {
        return sendError(res, 500, 'Ошибка при удалении контакта из базы знаний', [err.message]);
    }

    return sendSuccess(res, 200, 'Контакт успешно удалён из базы знаний', { id });
};
