const { getConnectionStatus } = require('../../services/google/client');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    try {
        const status = await getConnectionStatus();
        return successHandler(res, 200, 'Статус Google Drive получен', status);
    } catch (error) {
        return errorHandler(res, 500, 'Ошибка получения статуса Google Drive', [
            { path: 'server', message: error.message },
        ]);
    }
};
