const AgentRole = require('../../models/agent-role');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    const { id } = req.validatedData.params;

    try {
        const role = await AgentRole.findById(id).lean();

        if (!role) {
            return errorHandler(
                res,
                404,
                'Роль агента не найдена',
                [{ path: 'id', message: `Роль с ID ${id} не существует` }]
            );
        }

        return successHandler(
            res,
            200,
            'Данные роли агента успешно получены',
            role
        );

    } catch (error) {
        return errorHandler(
            res,
            500,
            'Ошибка сервера при получении роли агента',
            [{ path: 'server', message: error.message }]
        );
    }
};