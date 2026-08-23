const Topic = require('../../models/topic');
const { TOPIC_POPULATE } = require('../../constants/topic-populate');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const { id } = req.validatedData.params;
    const userId = req.user?.id;

    try {
        const topic = await Topic.findById(id).populate(TOPIC_POPULATE).lean();

        if (!topic) {
            return errorHandler(res, 404, 'Тема не найдена', [
                { path: 'id', message: `Тема с ID ${id} отсутствует в системе` }
            ]);
        }

        return successHandler(res, 200, 'Данные темы получены', topic);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.SERVER_ERROR.key,
            message: `Критическая ошибка темы при получении ID ${id}: ${error.message}`,
            userId,
            entityId: id,
            status: 'error'
        });

        return errorHandler(res, 500, 'Ошибка сервера при получении темы', [
            { path: 'server', message: error.message }
        ]);
    }
};
