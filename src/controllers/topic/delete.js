const Topic = require('../../models/topic');
const { deleteTopicFromQdrant } = require('../../services/qdrant/delete-chunk');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const { id } = req.validatedData.params;
    const userId = req.user?.id;

    try {
        const topic = await Topic.findById(id).lean();

        if (!topic) {
            return errorHandler(res, 404, 'Тема не найдена', [
                { path: 'id', message: `Тема с ID ${id} отсутствует в системе` }
            ]);
        }

        // Сначала чистим векторы: если удалить документ первым и упасть здесь,
        // в Qdrant останутся чанки, которые уже нечем найти и удалить.
        try {
            await deleteTopicFromQdrant(id);
        } catch (cleanupError) {
            await logHandler({
                action: ACTIONS_CONFIG.TOPICS.actions.CLEANUP_ERROR.key,
                message: `Ошибка при очистке векторов темы: ${cleanupError.message}`,
                userId,
                entityId: id,
                status: 'error'
            });
            throw cleanupError;
        }

        await Topic.findByIdAndDelete(id);

        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.DELETE.key,
            message: `Тема "${topic.name}" успешно удалена`,
            userId,
            entityId: id,
            status: 'success'
        });

        return successHandler(res, 200, 'Тема успешно удалена', { id });

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.SERVER_ERROR.key,
            message: `Критическая ошибка при удалении темы ${id}: ${error.message}`,
            userId,
            entityId: id,
            status: 'error'
        });

        return errorHandler(res, 500, 'Ошибка сервера при удалении темы', [
            { path: 'server', message: error.message }
        ]);
    }
};
