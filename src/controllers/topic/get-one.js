const Topic = require('../../models/topic');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const { id } = req.validatedData.params;
    const userId = req.user?.id;

    try {
        const result = await Topic.findById(id)
            .populate('metadata.category', 'name')
            .populate('metadata.accessibleByRoles', 'name')
            .populate('createdBy', 'firstName lastName photoUrl') 
            .populate('updatedBy', 'firstName lastName photoUrl')
            .lean();

        return successHandler(res, 200, 'Данные темы получены', result);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.SERVER_ERROR.key,
            message: `Критическая ошибка темы при получении ID ${id}: ${error.message}`,
            userId,
            entityId: id,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при получении темы',
            [{ path: 'server', message: error.message }]
        );
    }
};