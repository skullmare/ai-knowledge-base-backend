const authService = require('../../services/auth.service');
const User = require('../../models/platformUser');
const { comparePassword } = require('../../utils/passwordHandler'); // Используем нашу утилиту
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');
const logHandler = require('../../utils/logHandler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    try {
        const { login: userLogin, password } = req.body;
        
        // Выбираем поле password явно, так как в схеме оно помечено select: false
        const user = await User.findOne({ login: userLogin }).select('+password');

        // 1. Проверка пользователя и сравнение пароля через хелпер
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

        const payload = { id: user._id, role: user.role };
        const { accessToken, refreshToken } = authService.generateTokens(payload);

        res.cookie('refreshToken', refreshToken, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production' 
        });

        // 2. Успешный вход (LOGIN_SUCCESS)
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