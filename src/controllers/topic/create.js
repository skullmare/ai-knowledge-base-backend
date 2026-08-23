const Topic = require('../../models/topic');
const { TOPIC_POPULATE } = require('../../constants/topic-populate');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const userId = req.user?.id;
    const data = req.validatedData.body;

    try {
        const topic = await Topic.create({ ...data, createdBy: userId, status: 'review' });
        await topic.populate(TOPIC_POPULATE);

        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.CREATE.key,
            message: `Создана новая тема: "${topic.name}"`,
            userId,
            entityId: topic._id,
            status: 'success'
        });

        return successHandler(res, 201, 'Тема успешно создана и отправлена на проверку', topic);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.SERVER_ERROR.key,
            message: `Ошибка сервера при создании темы: ${error.message}`,
            userId,
            status: 'error'
        });

        return errorHandler(res, 500, 'Ошибка сервера при создании темы', [
            { path: 'server', message: error.message }
        ]);
    }
};
