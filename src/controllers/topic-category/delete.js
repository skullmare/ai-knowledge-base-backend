const TopicCategory = require('../../models/topic-category');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentUserId = req.user?.id;
    const { id } = req.validatedData.params;

    try {
        const category = await TopicCategory.findByIdAndDelete(id);

        if (!category) {
            return errorHandler(res, 404, 'Категория не найдена', [
                { path: 'id', message: `Категория с ID ${id} отсутствует в системе` }
            ]);
        }

        await logHandler({
            action: ACTIONS_CONFIG.TOPIC_CATEGORIES.actions.DELETE.key,
            message: `Удалена категория: ${category.name}`,
            userId: currentUserId,
            entityId: id,
            status: 'success'
        });

        return successHandler(res, 200, 'Категория успешно удалена');

    } catch (error) {
        return errorHandler(res, 500, 'Ошибка сервера при удалении категории', [{ path: 'server', message: error.message }]);
    }
};