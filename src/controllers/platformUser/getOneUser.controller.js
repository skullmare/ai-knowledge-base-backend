const User = require('../../models/platformUser');
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');

module.exports = async (req, res) => {
    const { id } = req.validatedData.params;

    try {
        const user = await User.findById(id)
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