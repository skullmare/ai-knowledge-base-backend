const Topic = require('../../models/topic');
const { deleteTopicFromQdrant } = require('../../services/vector.service');
const { deleteMultipleFilesFromS3 } = require('../../services/storage.service');
const { deleteTopicSchema } = require('../../schemas/topic.schema');

// Утилиты и конфиг
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');
const logHandler = require('../../utils/logHandler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
        // 1. Валидация ID
        const validation = await deleteTopicSchema.safeParseAsync({ params: req.params });
        if (!validation.success) {
            // Экшена валидации нет в ACTIONS_CONFIG — логирование пропущено
            return errorHandler(
                res, 
                400, 
                'Ошибка параметров', 
                validation.error.issues.map(err => ({ path: 'id', message: err.message }))
            );
        }

        // 2. Поиск темы перед удалением
        const topic = await Topic.findById(id).lean();
        if (!topic) {
            // Экшена "Not Found" нет в ACTIONS_CONFIG — логирование пропущено
            return errorHandler(
                res, 
                404, 
                'Не найдено', 
                [{ path: 'id', message: 'Тема не существует или уже удалена' }]
            );
        }

        const fileUrls = topic.files?.map(f => f.url) || [];
        const topicName = topic.name || 'Без названия';

        // 3. Удаление из внешних систем и БД
        try {
            await Promise.all([
                deleteMultipleFilesFromS3(fileUrls),
                deleteTopicFromQdrant(id),
                Topic.findByIdAndDelete(id)
            ]);
        } catch (cleanupError) {
            // Используем специальный экшен для ошибок очистки S3/Qdrant
            await logHandler({
                action: ACTIONS_CONFIG.TOPICS.actions.CLEANUP_ERROR.key,
                message: `Ошибка при очистке ресурсов (S3/Qdrant/DB): ${cleanupError.message}`,
                userId,
                entityId: id,
                status: 'error'
            });
            throw cleanupError; 
        }

        // 4. Логирование успешного действия (TOPIC_DELETE)
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.DELETE.key,
            message: `Тема "${topicName}" и ${fileUrls.length} связанных файлов успешно удалены`,
            userId,
            entityId: id,
            status: 'success'
        });

        return successHandler(res, 200, 'Тема и связанные файлы успешно удалены', { id });

    } catch (error) {
        // Критическая ошибка модуля (TOPIC_ERROR)
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