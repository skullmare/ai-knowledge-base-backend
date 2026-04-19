const AgentUser = require('../../models/agent-user');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentPlatformUserId = req.user?.id;
    const { id } = req.validatedData.params;
    const data = req.validatedData.body;

    try {
        if (data.role) {
            data.status = 'active';
        }
        const updatedAgentUser = await AgentUser.findByIdAndUpdate(
            id,
            { $set: data },
            { returnDocument: 'after', runValidators: true }
        ).populate('role', 'name');

        if (!updatedAgentUser) {
            await logHandler({
                action: ACTIONS_CONFIG.AGENT_USERS.actions.UPDATE.key,
                message: `Попытка обновить несуществующего пользователя (ID: ${id})`,
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
            action: ACTIONS_CONFIG.AGENT_USERS.actions.UPDATE.key,
            message: `Обновлены данные пользователя: ${updatedAgentUser.chatId}`,
            userId: currentPlatformUserId,
            entityId: updatedAgentUser._id,
            status: 'success'
        });

        return successHandler(res, 200, 'Данные пользователя успешно обновлены', updatedAgentUser);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.AGENT_USERS.actions.SERVER_ERROR.key,
            message: `Ошибка при обновлении пользователя (ID: ${id}): ${error.message}`,
            userId: currentPlatformUserId,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при обновлении пользователя',
            [{ path: 'server', message: error.message }]
        );
    }
};