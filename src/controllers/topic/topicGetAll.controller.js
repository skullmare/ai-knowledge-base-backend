const Topic = require('../../models/topic');
const { getTopicsSchema } = require('../../schemas/topic.schema');

// Подключаем утилиты и конфиг
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');
const logHandler = require('../../utils/logHandler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const userId = req.user?.id;

    try {
        // 1. Валидация Query-параметров
        const validation = await getTopicsSchema.safeParseAsync({ query: req.query });
        if (!validation.success) {
            // Ключа для ошибки валидации нет в ACTIONS_CONFIG — логирование пропущено
            return errorHandler(
                res,
                400,
                'Ошибка фильтров',
                validation.error.issues.map(err => ({
                    path: err.path.filter(p => p !== 'query').join('.') || 'filter',
                    message: err.message
                }))
            );
        }

        const { page, limit, search, category, status } = validation.data.query;
        const filter = {};

        // 2. Сборка фильтров
        if (category) filter['metadata.category'] = category;
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } }, 
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        // 3. Выполнение запросов параллельно
        const [result, total] = await Promise.all([
            Topic.find(filter)
                .populate('metadata.category', 'name')
                .limit(limit)
                .skip((page - 1) * limit)
                .sort({ updatedAt: -1 })
                .lean(),
            Topic.countDocuments(filter)
        ]);

        // 4. Формирование объекта пагинации
        const pagination = {
            total,
            pages: Math.ceil(total / limit),
            current: page,
            limit
        };

        // 5. Успешный ответ (чтение не логируем согласно твоей логике)
        return successHandler(res, 200, 'Список тем успешно получен', result, pagination);

    } catch (error) {
        // Логируем системную ошибку модуля тем
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