const authService = require('../services/auth');
const PlatformUser = require('../models/platform-user');
const errorHandler = require('../utils/error-handler');

const unauthorized = (res, message) => errorHandler(res, 401, 'Ошибка авторизации', [
    { path: 'authorization', message }
]);

const auth = async (req, res, next) => {
    try {
        const [scheme, token] = (req.headers.authorization || '').split(' ');

        if (scheme !== 'Bearer' || !token) {
            return unauthorized(res, 'Токен не предоставлен');
        }

        const userData = authService.validateAccessToken(token);

        if (!userData) {
            return unauthorized(res, 'Неверный или просроченный токен');
        }

        const user = await PlatformUser.findById(userData.id).select('status').lean();

        if (!user) {
            return unauthorized(res, 'Пользователь не найден');
        }

        if (user.status === 'blocked') {
            return errorHandler(res, 403, 'Доступ запрещён', [
                { path: 'authorization', message: 'Ваш аккаунт заблокирован' }
            ]);
        }

        req.user = userData;
        return next();
    } catch (error) {
        return errorHandler(res, 500, 'Ошибка проверки авторизации', [
            { path: 'server', message: error.message }
        ]);
    }
};

module.exports = { auth };
