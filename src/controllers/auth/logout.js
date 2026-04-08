const errorHandler = require('../../utils/error-handler');
const successHandler = require('../../utils/success-handler');

module.exports = async (req, res) => {
    try {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/'
        });
        
        return successHandler(res, 200, 'Выход выполнен успешно', null);
        
    } catch (error) {
        return errorHandler(res, 500, 'Ошибка сервера', [
            { path: 'server', message: error.message }
        ]);
    }
};