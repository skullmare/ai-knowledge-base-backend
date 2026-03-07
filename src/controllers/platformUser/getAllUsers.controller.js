const User = require('../../models/platformUser');
const { getAllUsersSchema } = require('../../schemas/user.schema');

// Подключаем утилиты
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');

module.exports = async (req, res) => {
    try {
        // 1. Валидация и трансформация query-параметров через Zod
        const validation = await getAllUsersSchema.safeParseAsync({ query: req.query });

        if (!validation.success) {
            return errorHandler(
                res,
                400,
                'Некорректные параметры запроса',
                validation.error.issues.map(err => ({
                    path: err.path.filter(p => p !== 'query').join('.'),
                    message: err.message
                }))
            );
        }

        const { page, limit, search, role, status } = validation.data.query;

        // 2. Формирование динамического фильтра
        const filter = {};

        if (status) filter.status = status;
        if (role) filter.role = role;

        // Поиск по нескольким полям (логин или имя)
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            filter.$or = [
                { login: searchRegex },
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex }
            ];
        }

        // 3. Выполнение запроса с пагинацией и populate
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find(filter)
                .populate('role', 'name')
                .sort({ createdAt: -1 }) // Новые пользователи сверху
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(filter)
        ]);

        // 4. Формирование данных пагинации для successHandler
        const pagination = {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        };

        // 5. Успешный ответ
        return successHandler(
            res,
            200,
            'Список сотрудников успешно получен',
            users,
            pagination
        );

    } catch (error) {
        return errorHandler(
            res,
            500,
            'Ошибка сервера при получении списка пользователей',
            [{ path: 'server', message: error.message }]
        );
    }
};