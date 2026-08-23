const errorHandler = require('../../utils/error-handler');
const successHandler = require('../../utils/success-handler');

module.exports = async (req, res) => {
    try {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
            domain: process.env.MAIN_DOMAIN,
        });
        
        return successHandler(res, 200, 'Выход выполнен успешно', null);
        
    } catch (error) {
        return errorHandler(res, 500, 'Ошибка сервера', [
            { path: 'server', message: error.message }
        ]);
    }
};