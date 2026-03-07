/**
 * Отправка успешного ответа
 * @param {Object} res - Express response
 * @param {Number} statusCode - HTTP статус (200, 201 и т.д.)
 * @param {String} message - Сообщение об успехе
 * @param {Object|Array} data - Данные для клиента
 * @param {Object} [pagination=null] - Данные пагинации
 */
module.exports = (res, statusCode, message, data, pagination = null) => {
    const response = {
        success: true,
        message,
        data
    };

    if (pagination) {
        response.pagination = pagination;
    }

    return res.status(statusCode).json(response);
};