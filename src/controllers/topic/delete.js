const Topic = require('../../models/topic');
const { deleteTopicFromQdrant } = require('../../services/qdrant/delete-chunk');
const { deleteMultipleFilesFromS3 } = require('../../services/yandex/S3/delete-list');

const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const { id } = req.validatedData.params;
    const userId = req.user?.id;

    try {
        const topic = await Topic.findById(id).lean();

        const fileUrls = topic.files?.map(f => f.url) || [];
        const topicName = topic.name || 'Без названия';

        try {
            await Promise.all([
                deleteMultipleFilesFromS3(fileUrls),
                deleteTopicFromQdrant(id),
                Topic.findByIdAndDelete(id)
            ]);
        } catch (cleanupError) {
            await logHandler({
                action: ACTIONS_CONFIG.TOPICS.actions.CLEANUP_ERROR.key,
                message: `Ошибка при очистке ресурсов (S3/Qdrant/DB): ${cleanupError.message}`,
                userId,
                entityId: id,
                status: 'error'
            });
            throw cleanupError; 
        }

        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.DELETE.key,
            message: `Тема "${topicName}" и ${fileUrls.length} связанных файлов успешно удалены`,
            userId,
            entityId: id,
            status: 'success'
        });

        return successHandler(res, 200, 'Тема и связанные файлы успешно удалены', { id });

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.SERVER_ERROR.key,
            message: `Критическая ошибка при удалении темы ${id}: ${error.message}`,
            userId,
            entityId: id,
            status: 'error'
        });

        return errorHandler(
            res, 
            500, 
            'Ошибка сервера при удалении темы', 
            [{ path: 'server', message: error.message }]
        );
    }
};