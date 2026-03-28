const AgentRole = require('../../models/agent-role');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    const { ids } = req.validatedData.body;

    try {
        const result = await AgentRole.deleteMany({ _id: { $in: ids } });

        return successHandler(
            res,
            200,
            `Успешно удалено ролей: ${result.deletedCount}`,
            { deletedCount: result.deletedCount, ids }
        );

    } catch (error) {
        return errorHandler(
            res,
            500,
            'Ошибка сервера при массовом удалении ролей',
            [{ path: 'server', message: error.message }]
        );
    }
};