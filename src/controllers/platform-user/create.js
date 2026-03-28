const PlatformUser = require('../../models/platform-user');
const { hashPassword } = require('../../utils/password-handler');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentPlatformUserId = req.user?.id;
    const data = req.validatedData.body;

    try {
        const hashedPassword = await hashPassword(data.password);

        const newPlatformUser = await PlatformUser.create({
            ...data,
            password: hashedPassword
        });

        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_USERS.actions.CREATE.key,
            message: `Создан новый сотрудник: ${newPlatformUser.login} (${newPlatformUser.firstName} ${newPlatformUser.lastName})`,
            userId: currentPlatformUserId,
            entityId: newPlatformUser._id,
            status: 'success'
        });

        const responseData = newPlatformUser.toObject();
        delete responseData.password;

        return successHandler(res, 201, 'Сотрудник успешно создан', responseData);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_USERS.actions.SERVER_ERROR.key,
            message: `Ошибка при создании сотрудника: ${error.message}`,
            userId: currentPlatformUserId,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при добавлении сотрудника',
            [{ path: 'server', message: error.message }]
        );
    }
};