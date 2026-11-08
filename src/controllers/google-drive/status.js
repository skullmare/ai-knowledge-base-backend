const { getConnectionStatus, describeGoogleError } = require('../../services/google/client');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    try {
        const status = await getConnectionStatus();
        return successHandler(res, 200, 'Статус Google Drive получен', status);
    } catch (error) {
        // Отдаём 200 с явным признаком сбоя: 401 интерсептор фронтенда понял бы
        // как истёкшую сессию пользователя и выкинул его на страницу входа
        return errorHandler(res, 500, 'Ошибка получения статуса Google Drive', [
            { path: 'server', message: describeGoogleError(error, 'Статус Google Drive') },
        ]);
    }
};
