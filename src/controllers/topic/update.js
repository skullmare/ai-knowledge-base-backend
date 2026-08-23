const Topic = require('../../models/topic');
const { deleteTopicFromQdrant } = require('../../services/qdrant/delete-chunk');
const { TOPIC_POPULATE } = require('../../constants/topic-populate');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const userId = req.user?.id;
    const { id } = req.validatedData.params;
    const data = req.validatedData.body;

    try {
        const update = { updatedBy: userId };
        const changes = [];

        if (data.name) {
            update.name = data.name;
            changes.push('изменено название');
        }

        if (data.metadata) {
            Object.entries(data.metadata).forEach(([key, value]) => {
                update[`metadata.${key}`] = value;
            });
            changes.push('обновлены метаданные');
        }

        const nextStatus = data.status === 'archived' ? 'archived' : 'review';

        // Любая правка возвращает тему на проверку, поэтому проиндексированные
        // чанки становятся неактуальными — снимаем их из Qdrant и сбрасываем флаг.
        await deleteTopicFromQdrant(id);
        update.status = nextStatus;
        update['vectorData.isIndexed'] = false;
        changes.push(nextStatus === 'archived' ? 'тема архивирована' : 'тема отправлена на проверку');

        const result = await Topic.findByIdAndUpdate(
            id,
            { $set: update },
            { returnDocument: 'after', runValidators: true }
        ).populate(TOPIC_POPULATE);

        if (!result) {
            return errorHandler(res, 404, 'Тема не найдена', [
                { path: 'id', message: `Тема с ID ${id} отсутствует в системе` }
            ]);
        }

        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.UPDATE.key,
            message: `Тема "${result.name}" обновлена. Детали: ${changes.join(', ')}`,
            userId,
            entityId: id,
            status: 'success'
        });

        return successHandler(res, 200, 'Тема успешно обновлена', result);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.SERVER_ERROR.key,
            message: `Ошибка сервера при обновлении темы ${id}: ${error.message}`,
            userId,
            entityId: id,
            status: 'error'
        });

        return errorHandler(res, 500, 'Ошибка сервера при обновлении темы', [
            { path: 'server', message: error.message }
        ]);
    }
};
