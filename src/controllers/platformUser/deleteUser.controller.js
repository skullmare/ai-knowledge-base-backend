const User = require('../../models/platformUser');
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');
const logHandler = require('../../utils/logHandler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentUserId = req.user?.id;
    const { id } = req.validatedData.params;

    try {
        const userToDelete = await User.findByIdAndDelete(id);

        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_USERS.actions.DELETE.key,
            message: `Удален сотрудник: ${userToDelete.login} (${userToDelete.firstName} ${userToDelete.lastName})`,
            userId: currentUserId,
            entityId: id,
            status: 'success'
        });

        return successHandler(res, 200, `Сотрудник ${userToDelete.firstName} ${userToDelete.lastName} успешно удален из системы`, { id: id });

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_USERS.actions.SERVER_ERROR.key,
            message: `Ошибка при удалении сотрудника (ID: ${id}): ${error.message}`,
            userId: currentUserId,
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