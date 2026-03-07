const authService = require('../../services/auth.service');
const User = require('../../models/platformUser');
const bcrypt = require('bcryptjs');

// Утилиты и конфиг
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');
const logHandler = require('../../utils/logHandler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

const login = async (req, res) => {
    try {
        const { login: userLogin, password } = req.body;
        const user = await User.findOne({ login: userLogin }).select('+password');

        // 1. Проверка пользователя и пароля
        if (!user || !(await bcrypt.compare(password, user.password))) {
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
        // Системная ошибка авторизации
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

const refresh = async (req, res) => {
    const token = req.cookies.refreshToken;
    
    if (!token) {
        return errorHandler(res, 401, 'Сессия истекла');
    }

    const decoded = authService.validateRefreshToken(token);
    
    if (!decoded) {
        // Ошибка обновления токена (REFRESH_INVALID)
        await logHandler({
            action: ACTIONS_CONFIG.AUTH.actions.REFRESH_INVALID.key,
            message: 'Попытка обновления с невалидным или протухшим токеном',
            userId: null,
            status: 'error'
        });

        return errorHandler(res, 403, 'Невалидный токен обновления', [
            { path: 'refreshToken', message: 'Refresh token invalid or expired' }
        ]);
    }

    const { accessToken, refreshToken } = authService.generateTokens({ 
        id: decoded.id, 
        role: decoded.role 
    });

    res.cookie('refreshToken', refreshToken, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production' 
    });

    return successHandler(res, 200, 'Токен успешно обновлен', { accessToken });
};

const me = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('role');
        
        if (!user) {
            // Экшена "Not Found" для профиля нет в конфиге — логирование пропущено
            return errorHandler(res, 404, 'Пользователь не найден', [
                { path: 'id', message: 'Профиль не существует' }
            ]);
        }

        return successHandler(res, 200, 'Данные профиля получены', user);

    } catch (error) {
        // Системная ошибка в модуле профиля
        await logHandler({
            action: ACTIONS_CONFIG.AUTH.actions.SERVER_ERROR.key,
            message: `Ошибка получения профиля: ${error.message}`,
            userId: req.user?.id,
            status: 'error'
        });

        return errorHandler(res, 500, 'Ошибка сервера', [
            { path: 'server', message: error.message }
        ]);
    }
};

module.exports = { login, refresh, me };