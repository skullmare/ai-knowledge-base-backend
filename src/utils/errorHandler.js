const logger = require('./logger');

module.exports = (res, statusCode, message, errors = []) => {
    const errorDetails = Array.isArray(errors) 
        ? errors.map(err => (typeof err === 'object' && err !== null ? err.message : err)).filter(Boolean).join(', ')
        : (typeof errors === 'string' ? errors : "");

    logger.error(message, statusCode, errorDetails);

    return res.status(statusCode).json({
        success: false,
        message,
        errors
    });
};