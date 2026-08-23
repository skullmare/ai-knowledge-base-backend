const { clearRefreshCookie } = require('../../utils/auth-cookie');
const successHandler = require('../../utils/success-handler');

module.exports = async (req, res) => {
    clearRefreshCookie(res);
    return successHandler(res, 200, 'Выход выполнен успешно', null);
};
