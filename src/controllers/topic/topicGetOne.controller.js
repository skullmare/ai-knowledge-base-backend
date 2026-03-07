const Topic = require('../../models/topic');
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
        // 1. Валидация параметров пути
        const validation = await getOneTopicSchema.safeParseAsync({ params: req.params });
        if (!validation.success) {
            // Экшена валидации нет в ACTIONS_CONFIG — логирование в БД пропущено
            return errorHandler(
                res,
                400,
                'Ошибка параметров',
                validation.error.issues.map(err => ({
                    path: err.path.filter(p => p !== 'params').join('.') || 'id',
                    message: err.message
                }))
            );
        }

        // 2. Поиск темы с раскрытием связей (populate)
        const result = await Topic.findById(id)
            .populate('metadata.category', 'name')
            .populate('metadata.accessibleByRoles', 'label')
            .lean();

        // 3. Проверка на существование
        if (!result) {
            // Экшена "Not Found" нет в ACTIONS_CONFIG — логирование в БД пропущено
            return errorHandler(
                res,
                404,
                'Не найдено',
                [{ path: 'id', message: `Тема с ID ${id} не существует` }]
            );
        }

        // 4. Успешный ответ (без логирования в БД согласно правилам чтения)
        return successHandler(res, 200, 'Данные темы получены', result);

    } catch (error) {
        // Логируем системную ошибку (TOPIC_ERROR)
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.SERVER_ERROR.key,
            message: `Критическая ошибка темы при получении ID ${id}: ${error.message}`,
            userId,
            entityId: id,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при получении темы',
            [{ path: 'server', message: error.message }]
        );
    }
};