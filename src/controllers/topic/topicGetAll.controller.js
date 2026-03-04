const Topic = require('../../models/topic');
const { getTopicsSchema } = require('../../schemas/topic.schema');

module.exports = async (req, res) => {
    try {
        const validation = await getTopicsSchema.safeParseAsync({ query: req.query });
        if (!validation.success) return res.status(400).json({
            success: false,
            message: 'Ошибка фильтров',
            errors: validation.error.issues.map(err => ({
                path: err.path.filter(p => p !== 'query').join('.') || 'filter',
                message: err.message
            }))
        });

        const { page, limit, search, category, status } = validation.data.query;
        const filter = {};

        if (category) filter['metadata.category'] = category;
        if (status) filter.status = status;
        if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { content: { $regex: search, $options: 'i' } }];

        const [result, total] = await Promise.all([
            Topic.find(filter).populate('metadata.category', 'name').limit(limit).skip((page - 1) * limit).sort({ updatedAt: -1 }).lean(),
            Topic.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            message: 'Список получен',
            data: result,
            pagination: { total, pages: Math.ceil(total / limit), current: page, limit }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Ошибка сервера',
            errors: [{ path: 'server', message: error.message }]
        });
    }
};