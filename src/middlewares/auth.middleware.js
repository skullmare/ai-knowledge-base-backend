const authService = require('../services/auth.service');

const auth = (req, res, next) => {
    const header = req.headers.authorization;
    const token = header && header.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Ошибка авторизации',
            errors: [{ path: 'authorization', message: 'Токен не предоставлен' }]
        });
    }

    const userData = authService.validateAccessToken(token);

    if (!userData) {
        return res.status(401).json({
            success: false,
            message: 'Ошибка авторизации',
            errors: [{ path: 'authorization', message: 'Неверный или просроченный токен' }]
        });
    }

    req.user = userData;
    next();
};

module.exports = { auth };