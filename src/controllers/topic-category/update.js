const TopicCategory = require('../../models/topic-category');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentUserId = req.user?.id;
    const { params: { id }, body: data } = req.validatedData;

    try {
        const updatedCategory = await TopicCategory.findByIdAndUpdate(
            id,
            { $set: data },
            { returnDocument: 'after' }
        );

        await logHandler({
            action: ACTIONS_CONFIG.TOPIC_CATEGORIES.actions.UPDATE.key,
            message: `Обновлена категория: ${updatedCategory.name}`,
            userId: currentUserId,
            entityId: updatedCategory._id,
            status: 'success'
        });

        return successHandler(res, 200, 'Категория успешно обновлена', updatedCategory);

    } catch (error) {
        return errorHandler(res, 500, 'Ошибка сервера при обновлении категории', [{ path: 'server', message: error.message }]);
    }
};