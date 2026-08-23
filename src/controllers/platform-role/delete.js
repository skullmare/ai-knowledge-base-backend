const PlatformRole = require('../../models/platform-role');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentUserId = req.user?.id;
    const { id } = req.validatedData.params;

    try {
        const role = await PlatformRole.findByIdAndDelete(id);

        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_ROLES.actions.DELETE.key,
            message: `Удалена роль: ${role.name}`,
            userId: currentUserId,
            entityId: id,
            status: 'success'
        });

        return successHandler(res, 200, 'Роль успешно удалена', role);

    } catch (error) {
        return errorHandler(res, 500, 'Ошибка сервера при удалении роли', [{ path: 'server', message: error.message }]);
    }
};