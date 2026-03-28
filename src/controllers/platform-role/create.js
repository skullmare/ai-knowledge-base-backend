const PlatformRole = require('../../models/platform-role');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentUserId = req.user?.id;
    const data = req.validatedData.body;

    try {

        const newPlatformRole = await PlatformRole.create(data);

        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_ROLES.actions.CREATE.key,
            message: `Создана новая роль: ${newPlatformRole.name}`,
            userId: currentUserId,
            entityId: newPlatformRole._id,
            status: 'success'
        });

        return successHandler(res, 201, 'Роль успешно создана', newPlatformRole);

    } catch (error) {
        return errorHandler(res, 500, 'Ошибка сервера при создании роли', [{ path: 'server', message: error.message }]);
    }
};