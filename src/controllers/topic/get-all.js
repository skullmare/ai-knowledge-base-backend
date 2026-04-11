const Topic = require('../../models/topic');
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
        if (search) {
            filter.$text = { $search: search };
        }

        const [result, total] = await Promise.all([
            Topic.find(filter)
                .select({
                    markdownContent: 0,
                    ...(search ? { score: { $meta: "textScore" } } : {})
                })
                .populate('metadata.category', 'name')
                .populate('metadata.accessibleByRoles', 'name')
                .populate('createdBy', 'firstName lastName photoUrl')
                .populate('updatedBy', 'firstName lastName photoUrl')
                .limit(limit)
                .skip((page - 1) * limit)
                .sort(search ? { score: { $meta: "textScore" } } : { updatedAt: -1 })
                .lean(),
            Topic.countDocuments(filter)
        ]);

        const pagination = {
            total,
            pages: Math.ceil(total / limit),
            current: page,
            limit
        };

        return successHandler(res, 200, 'Список тем успешно получен', result, pagination);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.SERVER_ERROR.key,
            message: `Ошибка при получении списка тем: ${error.message}`,
            userId,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при получении списка тем',
            [{ path: 'server', message: error.message }]
        );
    }
};