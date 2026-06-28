const AgentUser = require('../../models/agent-user');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentPlatformUserId = req.user?.id;
    const { id } = req.validatedData.params;

    try {
        const deletedAgentUser = await AgentUser.findByIdAndDelete(id);

        if (!deletedAgentUser) {
            await logHandler({
                action: ACTIONS_CONFIG.AGENT_USERS.actions.DELETE.key,
                message: `Попытка удалить несуществующего пользователя (ID: ${id})`,
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

        await logHandler({
            action: ACTIONS_CONFIG.AGENT_USERS.actions.DELETE.key,
            message: `Удален пользователь (ID: ${deletedAgentUser._id})`,
            userId: currentPlatformUserId,
            entityId: deletedAgentUser._id,
            status: 'success'
        });

        return successHandler(res, 200, 'Пользователь успешно удален', { id: deletedAgentUser._id });

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.AGENT_USERS.actions.SERVER_ERROR.key,
            message: `Ошибка при удалении пользователя (ID: ${id}): ${error.message}`,
            userId: currentPlatformUserId,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при удалении пользователя',
            [{ path: 'server', message: error.message }]
        );
    }
};
