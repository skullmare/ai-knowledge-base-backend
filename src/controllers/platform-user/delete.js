const PlatformUser = require('../../models/platform-user');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentPlatformUserId = req.user?.id;
    const { id } = req.validatedData.params;

    try {
        const userToDelete = await PlatformUser.findByIdAndDelete(id);

        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_USERS.actions.DELETE.key,
            message: `Удален сотрудник: ${userToDelete.login} (${userToDelete.firstName} ${userToDelete.lastName})`,
            userId: currentPlatformUserId,
            entityId: id,
            status: 'success'
        });

        return successHandler(res, 200, `Сотрудник ${userToDelete.firstName} ${userToDelete.lastName} успешно удален из системы`, { id: id });

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_USERS.actions.SERVER_ERROR.key,
            message: `Ошибка при удалении сотрудника (ID: ${id}): ${error.message}`,
            userId: currentPlatformUserId,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при удалении сотрудника',
            [{ path: 'server', message: error.message }]
        );
    }
};