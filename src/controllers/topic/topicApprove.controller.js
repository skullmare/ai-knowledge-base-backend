const Topic = require('../../models/topic');
const Log = require('../../models/log');
const { syncTopicToQdrant } = require('../../services/vector.service');
const { getOneTopicSchema } = require('../../schemas/topic.schema');

module.exports = async (req, res) => {
    const { id } = req.params;
    try {
        const validation = await getOneTopicSchema.safeParseAsync({ params: req.params });
        if (!validation.success) return res.status(400).json({
            success: false,
            message: 'Ошибка параметров',
            errors: validation.error.issues.map(err => ({ path: 'id', message: err.message }))
        });

        const topic = await Topic.findById(id).populate('metadata.category');
        if (!topic) return res.status(404).json({
            success: false,
            message: 'Не найдено',
            errors: [{ path: 'id', message: 'Тема не существует' }]
        });

        await syncTopicToQdrant(topic);
        
        topic.status = 'approved';
        topic.vectorData = { ...topic.vectorData, isIndexed: true, lastIndexedAt: new Date() };
        topic.updatedBy = req.user.id;
        const result = await topic.save();

        await Log.create({
            action: 'TOPIC_APPROVED',
            user: req.user.id,
            entityType: 'Topic',
            entityId: id,
            details: { name: result.name }
        });

        return res.status(200).json({ success: true, message: 'Тема одобрена', data: result });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Ошибка сервера',
            errors: [{ path: 'server', message: error.message }]
        });
    }
};