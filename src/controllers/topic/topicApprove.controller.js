const Topic = require('../../models/topic');
const Log = require('../../models/log');
const { syncTopicToQdrant } = require('../../services/vector.service');

/**
 * Одобрение темы и синхронизация с векторной базой Qdrant
 */
module.exports = async (req, res) => {
    const { id } = req.params;
    
    try {
        // 1. Находим топик и подтягиваем категорию (она нужна для метаданных в векторе)
        const topic = await Topic.findById(id).populate('metadata.category');
        
        if (!topic) {
            return res.status(404).json({ message: 'Тема не найдена' });
        }

        // 2. Векторизация
        // Это "длинная" операция: парсинг контента -> эмбеддинги -> загрузка в Qdrant
        console.log(`🚀 Начинаю синхронизацию топика ${id} с Qdrant...`);
        await syncTopicToQdrant(topic);

        // 3. Обновляем статус в MongoDB только после успеха в Qdrant
        topic.status = 'approved';
        topic.vectorData.isIndexed = true;
        topic.vectorData.lastIndexedAt = new Date();
        topic.updatedBy = req.user.id;
        
        await topic.save();

        // 4. Логируем успех
        await Log.create({
            action: 'TOPIC_APPROVED',
            user: req.user.id,
            entityType: 'Topic',
            entityId: id,
            details: { message: 'Тема успешно векторизована и опубликована' }
        });

        res.json({ 
            message: 'Тема успешно одобрена и синхронизирована', 
            topic 
        });

    } catch (error) {
        console.error('❌ Ошибка при одобрении (Approve Error):', error);

        // 5. Логируем ошибку, чтобы админ мог понять, почему не проиндексировалось
        await Log.create({
            action: 'TOPIC_APPROVE_ERROR',
            user: req.user.id,
            entityType: 'Topic',
            entityId: id,
            status: 'error',
            details: { message: error.message }
        });

        res.status(500).json({ 
            message: 'Ошибка при векторизации (процесс синхронизации провален)', 
            error: error.message 
        });
    }
};