const TopicCategory = require('../../models/topic-category');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentUserId = req.user?.id;
    const { ids } = req.validatedData.body;
    try {
        await TopicCategory.deleteMany({ _id: { $in: ids } });

        await logHandler({
            action: ACTIONS_CONFIG.TOPIC_CATEGORIES.actions.DELETE.key,
            message: `Массовое удаление категорий. Количество: ${ids.length}`,
            userId: currentUserId,
            status: 'success'
        });

        return successHandler(res, 200, `Успешно удалено категорий: ${ids.length}`);

    } catch (error) {
        return errorHandler(res, 500, 'Ошибка сервера при массовом удалении', [{ path: 'server', message: error.message }]);
    }
};