const { rateLimit } = require('express-rate-limit');
const errorHandler = require('../utils/error-handler');

const createRateLimit = ({
    windowMs = 15 * 60 * 1000,
    max = 10,
    messageTemplate = 'Слишком много запросов с {ip}, попробуйте позже'
} = {}) => rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',  // для 8.x версии
    legacyHeaders: false,
    handler: (req, res) => {
        const retryAfterSec = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
        const retryMessage = retryAfterSec < 60
            ? `Попробуйте через ${retryAfterSec} сек.`
            : `Попробуйте через ${Math.ceil(retryAfterSec / 60)} мин.`;
        
        // Получаем реальный IP клиента
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
        
        // Подставляем IP в сообщение
        const finalMessage = messageTemplate.replace('{ip}', clientIp);
        
        return errorHandler(
            res,
            429,
            finalMessage,
            [{ path: 'rateLimit', message: retryMessage }]
        );
    }
});

module.exports = createRateLimit;