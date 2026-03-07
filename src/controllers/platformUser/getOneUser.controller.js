const User = require('../../models/platformUser');
const { getOneUserSchema } = require('../../schemas/user.schema');

// Подключаем утилиты
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');

module.exports = async (req, res) => {
    try {
        // 1. Валидация ID и автоматическая проверка существования в БД через Zod
        const validation = await getOneUserSchema.safeParseAsync({ params: req.params });

        if (!validation.success) {
            return errorHandler(
                res,
                404,
                'Пользователь не найден',
                validation.error.issues.map(err => ({
                    path: err.path.filter(p => p !== 'params').join('.'),
                    message: err.message
                }))
            );
        }

        const { id } = validation.data.params;

        // 2. Поиск пользователя с подгрузкой данных роли (populate)
        // Пароль исключен на уровне схемы (select: false), но populate('role') вытянет детали роли
        const user = await User.findById(id)
            .populate('role', 'name permissions') // Выбираем нужные поля роли
            .lean(); // lean() для ускорения чтения, если не нужны методы Mongoose

        // 3. Успешный ответ
        return successHandler(
            res, 
            200, 
            'Данные пользователя успешно получены', 
            user
        );

    } catch (error) {
        return errorHandler(
            res,
            500,
            'Ошибка сервера при получении данных пользователя',
            [{ path: 'server', message: error.message }]
        );
    }
};