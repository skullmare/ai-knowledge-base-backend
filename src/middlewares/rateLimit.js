const { rateLimit } = require('express-rate-limit');
const errorHandler = require('../utils/error-handler');

const createRateLimit = ({
    windowMs = 15 * 60 * 1000,
    max = 10,
    messageTemplate = 'Слишком много запросов, попробуйте позже'
} = {}) => rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
        const retryAfterSec = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
        const retryMessage = retryAfterSec < 60
            ? `Попробуйте через ${retryAfterSec} сек.`
            : `Попробуйте через ${Math.ceil(retryAfterSec / 60)} мин.`;
        
        return errorHandler(
            res,
            429,
            messageTemplate,
            [{ path: 'rateLimit', message: retryMessage }]
        );
    }
});

module.exports = createRateLimit;