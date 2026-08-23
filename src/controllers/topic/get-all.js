const Topic = require('../../models/topic');
const { TOPIC_POPULATE } = require('../../constants/topic-populate');
const { buildPagination } = require('../../utils/query-helpers');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const userId = req.user?.id;
    const { page, limit, search, category, role, status } = req.validatedData.query;

    try {
        const filter = {};
        if (category) filter['metadata.category'] = category;
        if (role) filter['metadata.accessibleByRoles'] = role;
        if (status) filter.status = status;
        if (search) filter.$text = { $search: search };

        const projection = search
            ? { markdownContent: 0, collaborationData: 0, score: { $meta: 'textScore' } }
            : { markdownContent: 0, collaborationData: 0 };

        const [topics, total] = await Promise.all([
            Topic.find(filter, projection)
                .populate(TOPIC_POPULATE)
                .sort(search ? { score: { $meta: 'textScore' } } : { updatedAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Topic.countDocuments(filter)
        ]);

        return successHandler(res, 200, 'Список тем успешно получен', topics, buildPagination(total, page, limit));

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.SERVER_ERROR.key,
            message: `Ошибка при получении списка тем: ${error.message}`,
            userId,
            status: 'error'
        });

        return errorHandler(res, 500, 'Ошибка сервера при получении списка тем', [
            { path: 'server', message: error.message }
        ]);
    }
};
