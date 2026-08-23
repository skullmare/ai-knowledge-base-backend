const authService = require('../services/auth');
const PlatformUser = require('../models/platform-user');
const errorHandler = require('../utils/error-handler');

const auth = async (req, res, next) => {
    const header = req.headers.authorization;
    const token = header && header.split(' ')[1];

    if (!token) {
        return errorHandler(
            res,
            401,
            'Ошибка авторизации',
            [{ path: 'authorization', message: 'Токен не предоставлен' }]
        );
    }

    const userData = authService.validateAccessToken(token);

    if (!userData) {
        return errorHandler(
            res,
            401,
            'Ошибка авторизации',
            [{ path: 'authorization', message: 'Неверный или просроченный токен' }]
        );
    }

    const user = await PlatformUser.findById(userData.id).select('status').lean();

    if (!user || user.status === 'blocked') {
        return errorHandler(
            res,
            403,
            'Доступ запрещён',
            [{ path: 'authorization', message: 'Ваш аккаунт заблокирован' }]
        );
    }

    req.user = userData;
    next();
};

module.exports = { auth };