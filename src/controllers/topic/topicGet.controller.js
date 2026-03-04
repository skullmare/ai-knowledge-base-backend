const Topic = require('../../models/topic');

exports.getAll = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, category, status } = req.query;
        const query = {};
        if (category) query['metadata.category'] = category;
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        const topics = await Topic.find(query)
            .populate('metadata.category', 'name')
            .populate('metadata.accessibleByRoles', 'label')
            .limit(limit * 1).skip((page - 1) * limit).sort({ updatedAt: -1 });

        const count = await Topic.countDocuments(query);
        res.json({ topics, totalPages: Math.ceil(count / limit), totalCount: count });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка получения списка', error: error.message });
    }
};

exports.getOne = async (req, res) => {
    try {
        const topic = await Topic.findById(req.params.id).populate('metadata.category').populate('metadata.accessibleByRoles');
        if (!topic) return res.status(404).json({ message: 'Не найдено' });
        res.json(topic);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
};