const PlatformUser = require('../../models/platform-user');
const { comparePassword, hashPassword } = require('../../utils/password-handler');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const userId = req.user?.id;
    const { oldPassword, newPassword } = req.validatedData.body;

    try {
        const user = await PlatformUser.findById(userId).select('+password');
        if (!user) {
            return errorHandler(res, 404, 'Пользователь не найден');
        }

        const isMatch = await comparePassword(oldPassword, user.password);
        if (!isMatch) {
            return errorHandler(res, 401, 'Неверный текущий пароль', [
                { path: 'oldPassword', message: 'Текущий пароль введен неверно' }
            ]);
        }

        const hashedNewPassword = await hashPassword(newPassword);
        
        await PlatformUser.findByIdAndUpdate(userId, { 
            $set: { password: hashedNewPassword } 
        });

        await logHandler({
            action: ACTIONS_CONFIG.PASSWORD.actions.PASSWORD_CHANGE.key,
            message: `Пользователь успешно сменил пароль`,
            userId,
            entityId: userId,
            status: 'success'
        });

        return successHandler(res, 200, 'Пароль успешно изменен');

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.PROFILE.actions.SERVER_ERROR.key,
            message: `Критическая ошибка при смене пароля: ${error.message}`,
            userId,
            status: 'error'
        });

        return errorHandler(res, 500, 'Ошибка сервера', [
            { path: 'server', message: error.message }
        ]);
    }
};