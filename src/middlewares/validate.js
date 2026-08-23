const errorHandler = require('../utils/error-handler');

const ENVELOPE_KEYS = ['userId', 'body', 'params', 'query'];

const validate = (schema, errorMessage = 'Ошибка валидации') => async (req, res, next) => {
    const validation = await schema.safeParseAsync({
        userId: req.user?.id,
        body: req.body ?? {},
        params: req.params ?? {},
        query: req.query ?? {}
    });

    if (!validation.success) {
        const errors = validation.error.issues.map(issue => ({
            path: issue.path.filter(part => !ENVELOPE_KEYS.includes(part)).join('.'),
            message: issue.message
        }));

        return errorHandler(res, 400, errorMessage, errors);
    }

    req.validatedData = validation.data;
    return next();
};

module.exports = validate;
