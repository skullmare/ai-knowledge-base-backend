const Topic = require('../../models/topic');
const { deleteMultipleFilesFromS3 } = require('../../services/storage.service');
const { patchTopicSchema } = require('../../schemas/topic.schema');

// Утилиты и конфиг
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');
const logHandler = require('../../utils/logHandler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
        // 1. Валидация входных данных
        const validation = await patchTopicSchema.safeParseAsync({ params: req.params, body: req.body });

        if (!validation.success) {
            // Логирование пропущено: экшен отсутствует в ACTIONS_CONFIG
            return errorHandler(
                res,
                400,
                'Ошибка валидации',
                validation.error.issues.map(err => ({
                    path: err.path.filter(p => !['body', 'params'].includes(p)).join('.') || 'id',
                    message: err.message
                }))
            );
        }

        const { body: data } = validation.data;
        const topic = await Topic.findById(id);

        // 2. Проверка существования документа
        if (!topic) {
            // Логирование пропущено: экшен отсутствует в ACTIONS_CONFIG
            return errorHandler(
                res,
                404,
                'Объект не найден',
                [{ path: 'id', message: 'Тема не существует' }]
            );
        }

        const update = { $set: {}, $push: {}, $pull: {} };
        let changeSummary = [];

        // 3. Логика обработки файлов через S3
        if (data.filesToDelete?.length) {
            const toDelete = data.filesToDelete.filter(url => topic.files.some(f => f.url === url));
            if (toDelete.length) {
                await deleteMultipleFilesFromS3(toDelete);
                update.$pull.files = { url: { $in: toDelete } };
                changeSummary.push(`удалено файлов: ${toDelete.length}`);
            }
        }

        if (data.files?.length) {
            update.$push.files = { $each: data.files };
            changeSummary.push(`добавлено файлов: ${data.files.length}`);
        }

        // 4. Текстовые поля и сброс состояния индексации
        ['name', 'content'].forEach(field => {
            if (data[field]) {
                update.$set[field] = data[field];
                update.$set.status = 'review'; 
                update.$set['vectorData.isIndexed'] = false;
                changeSummary.push(`изменено поле: ${field}`);
            }
        });

        // 5. Обновление метаданных
        if (data.metadata) {
            Object.keys(data.metadata).forEach(key => {
                update.$set[`metadata.${key}`] = data.metadata[key];
            });
            changeSummary.push('обновлены метаданные');
        }

        // Очистка пустых операторов
        ['$set', '$push', '$pull'].forEach(op => { 
            if (!Object.keys(update[op]).length) delete update[op]; 
        });

        if (Object.keys(update).length === 0) {
            return successHandler(res, 200, 'Изменений не обнаружено', topic);
        }

        // 6. Выполнение обновления в БД
        const result = await Topic.findByIdAndUpdate(id, update, { new: true, runValidators: true })
            .populate('metadata.category', 'name');

        // 7. Логирование действия (TOPIC_UPDATE)
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.UPDATE.key,
            message: `Тема "${result.name || id}" обновлена. Детали: ${changeSummary.join(', ')}`,
            userId,
            entityId: id,
            status: 'success'
        });

        return successHandler(res, 200, 'Тема успешно обновлена', result);

    } catch (error) {
        // Логируем системную ошибку (TOPIC_ERROR)
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.SERVER_ERROR.key,
            message: `Ошибка сервера при обновлении темы ${id}: ${error.message}`,
            userId,
            entityId: id,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при обновлении темы',
            [{ path: 'server', message: error.message }]
        );
    }
};