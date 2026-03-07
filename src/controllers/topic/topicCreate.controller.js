const Topic = require('../../models/topic');
const { createTopicSchema } = require('../../schemas/topic.schema');

// Подключаем утилиты и конфиг
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');
const logHandler = require('../../utils/logHandler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const userId = req.user?.id;

    try {
        // 1. Валидация входных данных
        const validation = await createTopicSchema.safeParseAsync({ body: req.body });
        
        if (!validation.success) {
            // Экшена для ошибки валидации нет в ACTIONS_CONFIG — только возвращаем ответ
            return errorHandler(
                res,
                400,
                'Ошибка валидации',
                validation.error.issues.map(err => ({
                    path: err.path.filter(p => p !== 'body').join('.'),
                    message: err.message
                }))
            );
        }

        const { body: data } = validation.data;

        // 2. Создание записи в БД
        const result = await Topic.create({
            ...data,
            createdBy: userId,
            status: 'review'
        });

        // 3. Логирование успешного действия (TOPIC_CREATE)
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.CREATE.key,
            message: `Создана новая тема: "${result.name}"`,
            userId,
            entityId: result._id,
            status: 'success'
        });

        // 4. Успешный ответ (статус 201 Created)
        return successHandler(res, 201, 'Тема успешно создана и отправлена на проверку', result);

    } catch (error) {
        // Логируем системную ошибку темы (TOPIC_ERROR)
        await logHandler({
            action: ACTIONS_CONFIG.TOPICS.actions.SERVER_ERROR.key,
            message: `Ошибка сервера при создании темы: ${error.message}`,
            userId,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при создании темы',
            [{ path: 'server', message: error.message }]
        );
    }
};