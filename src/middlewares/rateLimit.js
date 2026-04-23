const errorHandler = require('../utils/error-handler');

const rateLimit = ({
    windowMs = 15 * 60 * 1000,
    max = 10,
    message = 'Слишком много запросов, попробуйте позже'
} = {}) => {
    const store = new Map();

    return (req, res, next) => {
        const now = Date.now();
        const ip = req.ip;
        const entry = store.get(ip);

        // cleanup expired entries on every request
        for (const [key, value] of store) {
            if (now > value.resetAt) store.delete(key);
        }

        if (!entry || now > entry.resetAt) {
            store.set(ip, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (entry.count >= max) {
            const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
            const retryMessage = retryAfterSec < 60
                ? `Попробуйте через ${retryAfterSec} сек.`
                : `Попробуйте через ${Math.ceil(retryAfterSec / 60)} мин.`;

            res.set('Retry-After', String(retryAfterSec));

            return errorHandler(
                res,
                429,
                message,
                [{ path: 'rateLimit', message: retryMessage }]
            );
        }

        entry.count++;
        next();
    };
};

module.exports = rateLimit;
