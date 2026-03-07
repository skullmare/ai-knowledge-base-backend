const User = require('../../models/platformUser');
const { createUserSchema } = require('../../schemas/user.schema');
const { hashPassword } = require('../../utils/passwordHelper');

// Подключаем утилиты и конфиг
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');
const logHandler = require('../../utils/logHandler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentUserId = req.user?.id;

    try {
        // 1. Валидация (включая проверку уникальности логина в БД)
        const validation = await createUserSchema.safeParseAsync({ body: req.body });
        
        if (!validation.success) {
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

        // 2. Хеширование пароля через утилиту
        const hashedPassword = await hashPassword(data.password);

        // 3. Создание записи
        const newUser = await User.create({
            ...data,
            password: hashedPassword
        });

        // 4. Логирование (PLATFORM_USER_CREATE)
        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_USERS.actions.CREATE.key,
            message: `Создан новый сотрудник: ${newUser.login} (${newUser.firstName} ${newUser.lastName})`,
            userId: currentUserId,
            entityId: newUser._id,
            status: 'success'
        });

        // Подготовка данных для ответа
        const responseData = newUser.toObject();
        delete responseData.password;

        return successHandler(res, 201, 'Сотрудник успешно создан', responseData);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_USERS.actions.SERVER_ERROR.key,
            message: `Ошибка при создании сотрудника: ${error.message}`,
            userId: currentUserId,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при добавлении сотрудника',
            [{ path: 'server', message: error.message }]
        );
    }
};