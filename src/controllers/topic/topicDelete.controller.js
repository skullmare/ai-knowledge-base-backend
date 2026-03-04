const Topic = require('../../models/topic');
const Log = require('../../models/log');
const { deleteTopicFromQdrant } = require('../../services/vector.service');

module.exports = async (req, res) => {
    try {
        const { id } = req.params;
        const topic = await Topic.findById(id);
        if (!topic) return res.status(404).json({ message: 'Не найдено' });

        await deleteTopicFromQdrant(id);
        await Topic.findByIdAndDelete(id);

        await Log.create({
            action: 'TOPIC_DELETED',
            user: req.user.id,
            entityType: 'Topic',
            entityId: id,
            details: { name: topic.name }
        });

        res.json({ message: 'Удалено успешно' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка удаления', error: error.message });
    }
};