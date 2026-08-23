const PlatformRole = require('../../models/platform-role');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentUserId = req.user?.id;
    const { params, body } = req.validatedData;

    try {

        const updatedPlatformRole = await PlatformRole.findByIdAndUpdate(
            params.id,
            { $set: body },
            { returnDocument: 'after' }
        );

        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_ROLES.actions.UPDATE.key,
            message: `Обновлена роль: ${updatedPlatformRole.name}`,
            userId: currentUserId,
            entityId: updatedPlatformRole._id,
            status: 'success'
        });

        return successHandler(res, 200, 'Роль успешно обновлена', updatedPlatformRole);

    } catch (error) {
        return errorHandler(res, 500, 'Ошибка сервера при обновлении роли', [{ path: 'server', message: error.message }]);
    }
};