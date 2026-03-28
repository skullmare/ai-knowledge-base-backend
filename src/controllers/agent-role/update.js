const AgentRole = require('../../models/agent-role');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');


module.exports = async (req, res) => {
    const { id } = req.validatedData.params;
    const updateData = req.validatedData.body;

    try {
        const updatedRole = await AgentRole.findByIdAndUpdate(
            id,
            { $set: updateData },
            { returnDocument: 'after', runValidators: true }
        ).lean();

        if (!updatedRole) {
            return errorHandler(
                res,
                404,
                'Роль агента не найдена',
                [{ path: 'id', message: `Не удалось обновить роль с ID ${id}` }]
            );
        }

        return successHandler(
            res,
            200,
            `Роль "${updatedRole.name}" успешно обновлена`,
            updatedRole
        );

    } catch (error) {
        return errorHandler(
            res,
            500,
            'Ошибка сервера при обновлении роли агента',
            [{ path: 'server', message: error.message }]
        );
    }
};