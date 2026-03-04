const Topic = require('../../models/topic');
const { getOneTopicSchema } = require('../../schemas/topic.schema');

module.exports = async (req, res) => {
    const { id } = req.params;
    try {
        const validation = await getOneTopicSchema.safeParseAsync({ params: req.params });
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: 'Ошибка параметров',
                errors: validation.error.issues.map(err => ({
                    path: err.path.filter(p => p !== 'params').join('.') || 'id',
                    message: err.message
                }))
            });
        }

        const result = await Topic.findById(id)
            .populate('metadata.category', 'name')
            .populate('metadata.accessibleByRoles', 'label')
            .lean();

        if (!result) return res.status(404).json({
            success: false,
            message: 'Не найдено',
            errors: [{ path: 'id', message: `Тема с ID ${id} не существует` }]
        });

        return res.status(200).json({ success: true, message: 'Данные получены', data: result });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Ошибка сервера',
            errors: [{ path: 'server', message: error.message }]
        });
    }
};