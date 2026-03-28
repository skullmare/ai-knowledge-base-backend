const authService = require('../services/auth');
const errorHandler = require('../utils/error-handler');

const auth = (req, res, next) => {
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

    req.user = userData;
    next();
};

module.exports = { auth };