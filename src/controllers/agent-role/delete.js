const AgentRole = require('../../models/agent-role');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    const { id } = req.validatedData.params;

    try {
        const deletedRole = await AgentRole.findByIdAndDelete(id).lean();

        return successHandler(
            res,
            200,
            `Роль агента "${deletedRole.name}" успешно удалена`,
            { id }
        );

    } catch (error) {
        return errorHandler(
            res,
            500,
            'Ошибка сервера при удалении роли агента',
            [{ path: 'server', message: error.message }]
        );
    }
};