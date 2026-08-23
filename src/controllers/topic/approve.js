const Topic = require('../../models/topic');
const { syncTopicToQdrant } = require('../../services/qdrant/sync-chunk');
const { TOPIC_POPULATE } = require('../../constants/topic-populate');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const { id } = req.validatedData.params;
    const userId = req.user?.id;

    try {
        const topic = await Topic.findById(id).populate(TOPIC_POPULATE).select('+markdownContent');

        if (!topic) {
            return errorHandler(res, 404, 'Тема не найдена', [
                { path: 'id', message: `Тема с ID ${id} отсутствует в системе` }
            ]);
        }

        if (topic.status === 'approved') {
            return errorHandler(res, 409, 'Тема уже одобрена', [
                { path: 'status', message: 'Тема уже имеет статус approved' }
            ]);
        }

        if (!topic.markdownContent?.trim()) {
            return errorHandler(res, 422, 'Нельзя одобрить пустую тему', [
                { path: 'markdownContent', message: 'Добавьте содержимое темы перед одобрением' }
            ]);
        }

        await syncTopicToQdrant(topic);

        topic.status = 'approved';
        topic.vectorData = { isIndexed: true, lastIndexedAt: new Date() };
        topic.updatedBy = userId;

        const result = await topic.save();

        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.APPROVE.key,
            message: `Тема "${topic.name}" успешно одобрена и отправлена в Qdrant`,
            userId,
            entityId: id,
            status: 'success'
        });

        return successHandler(res, 200, 'Тема успешно одобрена и индексирована', result);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.SERVER_ERROR.key,
            message: `Ошибка при одобрении: ${error.message}`,
            userId,
            entityId: id,
            status: 'error'
        });

        return errorHandler(res, 500, 'Ошибка сервера', [
            { path: 'server', message: error.message }
        ]);
    }
};
