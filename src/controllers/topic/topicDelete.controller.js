const Topic = require('../../models/topic');
const Log = require('../../models/log');
const { deleteTopicFromQdrant } = require('../../services/vector.service');
const { deleteTopicFiles } = require('../../services/storage.service');
const { deleteTopicSchema } = require('../../schemas/topic.schema');

module.exports = async (req, res) => {
    const { id } = req.params;
    try {
        const validation = await deleteTopicSchema.safeParseAsync({ params: req.params });
        if (!validation.success) return res.status(400).json({
            success: false,
            message: 'Ошибка параметров',
            errors: validation.error.issues.map(err => ({ path: 'id', message: err.message }))
        });

        const result = await Topic.findById(id).lean();
        if (!result) return res.status(404).json({
            success: false,
            message: 'Не найдено',
            errors: [{ path: 'id', message: 'Тема не существует' }]
        });

        await Promise.all([deleteTopicFiles(id), deleteTopicFromQdrant(id), Topic.findByIdAndDelete(id)]);

        await Log.create({
            action: 'TOPIC_DELETED',
            user: req.user.id,
            entityType: 'Topic',
            entityId: id,
            details: { name: result.name }
        });

        return res.status(200).json({ success: true, message: 'Тема удалена', data: { id } });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Ошибка сервера',
            errors: [{ path: 'server', message: error.message }]
        });
    }
};