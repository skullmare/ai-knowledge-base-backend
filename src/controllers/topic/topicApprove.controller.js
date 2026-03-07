const Topic = require('../../models/topic');
const { syncTopicToQdrant } = require('../../services/vector.service');
const { getOneTopicSchema } = require('../../schemas/topic.schema');

// Подключаем утилиты и конфиг
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');
const logHandler = require('../../utils/logHandler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
        // 1. Валидация входных данных
        const validation = await getOneTopicSchema.safeParseAsync({ params: req.params });
        if (!validation.success) {
            // Событие валидации отсутствует в ACTIONS_CONFIG — логирование пропущено
            return errorHandler(
                res, 
                400, 
                'Ошибка параметров', 
                validation.error.issues.map(err => ({ path: 'id', message: err.message }))
            );
        }

        // 2. Поиск темы
        const topic = await Topic.findById(id).populate('metadata.category');
        if (!topic) {
            // Событие "Не найдено" отсутствует в ACTIONS_CONFIG — логирование пропущено
            return errorHandler(
                res, 
                404, 
                'Не найдено', 
                [{ path: 'id', message: 'Тема не существует' }]
            );
        }

        // 3. Синхронизация с вектором и обновление статуса
        await syncTopicToQdrant(topic);
        
        topic.status = 'approved';
        topic.vectorData = { 
            ...topic.vectorData, 
            isIndexed: true, 
            lastIndexedAt: new Date() 
        };
        topic.updatedBy = userId;
        
        const result = await topic.save();

        // 4. Логирование успешного действия (Используем TOPIC_APPROVE)
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.APPROVE.key,
            message: `Тема "${topic.name || id}" успешно одобрена и отправлена в Qdrant`,
            userId,
            entityId: id,
            status: 'success'
        });

        // 5. Успешный ответ
        return successHandler(res, 200, 'Тема успешно одобрена и индексирована', result);

    } catch (error) {
        // Логируем системную ошибку модуля тем
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.SERVER_ERROR.key,
            message: `Ошибка при одобрении: ${error.message}`,
            userId,
            entityId: id,
            status: 'error'
        });

        return errorHandler(
            res, 
            500, 
            'Ошибка сервера', 
            [{ path: 'server', message: error.message }]
        );
    }
};