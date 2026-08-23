const AgentUser = require('../../models/agent-user');
const { notifyAccessGranted } = require('../../services/agent-user/notify');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentPlatformUserId = req.user?.id;
    const { id } = req.validatedData.params;
    const data = req.validatedData.body;

    try {
        const previous = await AgentUser.findById(id).lean();

        if (!previous) {
            return errorHandler(res, 404, 'Пользователь не найден', [
                { path: 'id', message: 'Пользователь с указанным ID не существует' }
            ]);
        }

        // Назначение роли — это и есть выдача доступа, статус pending после неё бессмысленен.
        const update = data.role ? { ...data, status: data.status ?? 'active' } : { ...data };

        const agentUser = await AgentUser.findByIdAndUpdate(
            id,
            { $set: update },
            { returnDocument: 'after', runValidators: true }
        ).populate('role', 'name');

        await logHandler({
            action: ACTIONS_CONFIG.AGENT_USERS.actions.UPDATE.key,
            message: `Обновлены данные пользователя (ID: ${agentUser._id})`,
            userId: currentPlatformUserId,
            entityId: agentUser._id,
            status: 'success'
        });

        if (!previous.role && agentUser.role) {
            await notifyAccessGranted(agentUser);
        }

        return successHandler(res, 200, 'Данные пользователя успешно обновлены', agentUser);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.AGENT_USERS.actions.SERVER_ERROR.key,
            message: `Ошибка при обновлении пользователя (ID: ${id}): ${error.message}`,
            userId: currentPlatformUserId,
            status: 'error'
        });

        return errorHandler(res, 500, 'Ошибка сервера при обновлении пользователя', [
            { path: 'server', message: error.message }
        ]);
    }
};
