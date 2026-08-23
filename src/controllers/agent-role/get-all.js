const AgentRole = require('../../models/agent-role');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    const { search } = req.validatedData.query;

    try {
        const filter = {};

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            filter.$or = [
                { name: searchRegex },
                { description: searchRegex }
            ];
        }

        const roles = await AgentRole.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        return successHandler(
            res,
            200,
            'Список ролей пользователей агента успешно получен',
            roles
        );

    } catch (error) {
        return errorHandler(
            res,
            500,
            'Ошибка сервера при получении списка ролей пользователей агента',
            [{ path: 'server', message: error.message }]
        );
    }
};