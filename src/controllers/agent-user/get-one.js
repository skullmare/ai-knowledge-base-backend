const AgentUser = require('../../models/agent-user');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentPlatformUserId = req.user?.id;
    const { id } = req.validatedData.params;

    try {
        const agentUser = await AgentUser.findById(id).populate('role', 'name');

        if (!agentUser) {
            await logHandler({
                action: ACTIONS_CONFIG.AGENT_USERS.actions.READ.key,
                message: `Попытка получить несуществующего пользователя (ID: ${id})`,
                userId: currentPlatformUserId,
                status: 'error'
            });

            return errorHandler(
                res,
                404,
                'Пользователь не найден',
                [{ path: 'id', message: 'Пользователь с указанным ID не существует' }]
            );
        }

        return successHandler(res, 200, 'Данные пользователя успешно получены', agentUser);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.AGENT_USERS.actions.SERVER_ERROR.key,
            message: `Ошибка при получении пользователя (ID: ${id}): ${error.message}`,
            userId: currentPlatformUserId,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при получении пользователя',
            [{ path: 'server', message: error.message }]
        );
    }
};
