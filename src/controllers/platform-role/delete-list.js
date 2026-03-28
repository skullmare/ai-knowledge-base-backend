const PlatformRole = require('../../models/platform-role');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentUserId = req.user?.id;
    const { ids } = req.validatedData.body;

    try {

        const result = await PlatformRole.deleteMany({ _id: { $in: ids } });

        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_ROLES.actions.DELETE_MANY.key,
            message: `Успешно удалено ролей: ${result.deletedCount}`,
            userId: currentUserId,
            status: 'success'
        });

        return successHandler(res, 200, 'Роли успешно удалены', { count: result.deletedCount });

    } catch (error) {
        return errorHandler(res, 500, 'Ошибка сервера', [{ path: 'server', message: error.message }]);
    }
};