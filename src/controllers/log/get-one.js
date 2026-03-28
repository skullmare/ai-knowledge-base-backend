const Log = require('../../models/log');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    const { id } = req.validatedData.params;

    try {
        const log = await Log.findById(id)
            .populate('user', 'login firstName lastName email')
            .lean();

        if (!log) {
            return errorHandler(
                res,
                404,
                'Запись лога не найдена',
                [{ path: 'id', message: `Лог с ID ${id} отсутствует в базе` }]
            );
        }

        return successHandler(
            res,
            200,
            'Детальная информация о логе получена',
            log
        );

    } catch (error) {
        return errorHandler(
            res,
            500,
            'Ошибка сервера при получении лога',
            [{ path: 'server', message: error.message }]
        );
    }
};