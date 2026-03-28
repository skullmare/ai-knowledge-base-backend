const PlatformUser = require('../../models/platform-user');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    const { id } = req.validatedData.params;

    try {
        const user = await PlatformUser.findById(id)
            .populate('role', 'name permissions')
            .lean();

        return successHandler(
            res, 
            200, 
            'Данные пользователя успешно получены', 
            user
        );

    } catch (error) {
        return errorHandler(
            res,
            500,
            'Ошибка сервера при получении данных пользователя',
            [{ path: 'server', message: error.message }]
        );
    }
};