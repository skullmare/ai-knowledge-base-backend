const PlatformRole = require('../../models/platform-role');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    const { id } = req.validatedData.params;

    try {

        const role = await PlatformRole.findById(id);

        if (!role) {
            return errorHandler(
                res, 
                404, 
                'Роль не найдена', 
                [{ path: 'id', message: `Роль с ID ${id} отсутствует в системе` }]
            );
        }

        return successHandler(res, 200, 'Данные роли получены', role);

    } catch (error) {
        return errorHandler(
            res, 
            500, 
            'Ошибка сервера при получении данных роли', 
            [{ path: 'server', message: error.message }]
        );
    }
};