const authService = require('../../services/auth.service');
const User = require('../../models/platformUser');
const { comparePassword } = require('../../utils/passwordHandler');
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');
const logHandler = require('../../utils/logHandler');
const { ACTIONS_CONFIG } = require('../../constants/actions');
const logger = require('../../utils/logger');

module.exports = async (req, res) => {
    try {
        const { login: userLogin, password } = req.body;
        const user = await User.findOne({ login: userLogin }).select('+password');

        if (!user || !(await comparePassword(password, user.password))) {
            await logHandler({
                action: ACTIONS_CONFIG.AUTH.actions.LOGIN_FAILED.key,
                message: `Неудачная попытка входа для логина: ${userLogin}`,
                userId: user?._id || null,
                status: 'error'
            });

            return errorHandler(res, 401, 'Ошибка авторизации', [
                { path: 'login', message: 'Неверный логин или пароль' }
            ]);
        }

        try {
            await User.findByIdAndUpdate(user._id, {
                lastLogin: new Date()
            });
        } catch (error) {
            logger.error('Ошибка при обновлении lastLogin', details = error.message);
        }

        const payload = { id: user._id, role: user.role };
        const { accessToken, refreshToken } = authService.generateTokens(payload);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
        });

        await logHandler({
            action: ACTIONS_CONFIG.AUTH.actions.LOGIN_SUCCESS.key,
            message: `Пользователь ${userLogin} успешно вошел в систему`,
            userId: user._id,
            status: 'success'
        });

        return successHandler(res, 200, 'Вход выполнен успешно', { accessToken });

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.AUTH.actions.SERVER_ERROR.key,
            message: `Ошибка сервера при входе: ${error.message}`,
            userId: null,
            status: 'error'
        });

        return errorHandler(res, 500, 'Ошибка сервера', [
            { path: 'server', message: error.message }
        ]);
    }
};