const Topic = require('../../models/topic');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const userId = req.user?.id;
    const data = req.validatedData.body;

    try {
        const result = await Topic.create({
            ...data,
            createdBy: userId,
            status: 'review'
        });

        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.CREATE.key,
            message: `Создана новая тема: "${result.name}"`,
            userId,
            entityId: result._id,
            status: 'success'
        });

        return successHandler(res, 201, 'Тема успешно создана и отправлена на проверку', result);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.SERVER_ERROR.key,
            message: `Ошибка сервера при создании темы: ${error.message}`,
            userId,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при создании темы',
            [{ path: 'server', message: error.message }]
        );
    }
};