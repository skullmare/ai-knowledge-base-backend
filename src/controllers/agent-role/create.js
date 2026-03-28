const AgentRole = require('../../models/agent-role');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    const { name, description } = req.validatedData.body;

    try {
        const newRole = await AgentRole.create({
            name,
            description
        });

        return successHandler(
            res, 
            201, 
            `Роль агента "${name}" успешно создана`, 
            newRole
        );

    } catch (error) {
        return errorHandler(
            res, 
            500, 
            'Ошибка сервера при создании роли агента', 
            [{ path: 'server', message: error.message }]
        );
    }
};