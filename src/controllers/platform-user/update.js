const PlatformUser = require('../../models/platform-user');
const { hashPassword } = require('../../utils/password-handler');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentPlatformUserId = req.user?.id;

    const { id } = req.validatedData.params;
    const data = req.validatedData.body;

    try {
        const updatedPlatformUser = await PlatformUser.findByIdAndUpdate(
            id,
            { $set: data },
            { returnDocument: 'after' }
        ).populate('role', 'name');

        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_USERS.actions.UPDATE.key,
            message: `Обновлены данные сотрудника: ${updatedPlatformUser.login}`,
            userId: currentPlatformUserId,
            entityId: updatedPlatformUser._id,
            status: 'success'
        });

        const responseData = updatedPlatformUser.toObject();
        delete responseData.password;

        return successHandler(res, 200, 'Данные сотрудника успешно обновлены', responseData);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_USERS.actions.SERVER_ERROR.key,
            message: `Ошибка при обновлении сотрудника (ID: ${id}): ${error.message}`,
            userId: currentPlatformUserId,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при обновлении сотрудника',
            [{ path: 'server', message: error.message }]
        );
    }
};