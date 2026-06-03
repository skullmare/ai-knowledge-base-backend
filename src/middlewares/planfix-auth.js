const sendError = require('../utils/error-handler');

module.exports = (req, res, next) => {
    const header = req.headers.authorization;
    const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token || token !== process.env.PLANFIX_WEBHOOK_SECRET) {
        return sendError(res, 401, 'Неверный или отсутствующий токен авторизации');
    }

    next();
};
