/**
 * Отправка ответа с ошибкой
 * @param {Object} res - Express response
 * @param {Number} statusCode - HTTP статус (400, 404, 500 и т.д.)
 * @param {String} message - Краткое описание ошибки
 * @param {Array} errors - Массив объектов [{ path: '...', message: '...' }]
 */
module.exports = (res, statusCode, message, errors = []) => {
    return res.status(statusCode).json({
        success: false,
        message,
        errors
    });
};