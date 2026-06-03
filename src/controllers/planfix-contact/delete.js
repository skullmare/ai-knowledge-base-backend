const { deleteTopicFromQdrant } = require('../../services/qdrant/delete-chunk');
const sendSuccess = require('../../utils/success-handler');

module.exports = async (req, res) => {
    const { id } = req.params;

    const topicId = `contact_id:${id}`;
    await deleteTopicFromQdrant(topicId);

    return sendSuccess(res, 200, 'Контакт успешно удалён из базы знаний', { id });
};
