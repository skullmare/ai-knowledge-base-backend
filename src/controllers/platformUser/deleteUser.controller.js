const User = require('../../models/platformUser');
const { deleteUserSchema } = require('../../schemas/user.schema');

// Подключаем утилиты и конфиг
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');
const logHandler = require('../../utils/logHandler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentUserId = req.user?.id;
    const { id: targetUserId } = req.params;

    try {
        // 1. Валидация ID и проверка существования пользователя в БД
        const validation = await deleteUserSchema.safeParseAsync({ params: req.params });

        if (!validation.success) {
            return errorHandler(
                res,
                404, // Используем 404, так как superRefine вернет ошибку, если юзер не найден
                'Ошибка валидации',
                validation.error.issues.map(err => ({
                    path: err.path.filter(p => p !== 'params').join('.'),
                    message: err.message
                }))
            );
        }

        // 2. Получаем данные пользователя перед удалением для информативного лога
        const userToDelete = await User.findById(targetUserId);

        // 3. Удаление пользователя
        await User.findByIdAndDelete(targetUserId);

        // 4. Логирование успешного удаления (PLATFORM_USER_DELETE)
        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_USERS.actions.DELETE.key,
            message: `Удален сотрудник: ${userToDelete.login} (${userToDelete.firstName} ${userToDelete.lastName})`,
            userId: currentUserId,
            entityId: targetUserId,
            status: 'success'
        });

        // 5. Успешный ответ
        return successHandler(res, 200, 'Сотрудник успешно удален из системы', { id: targetUserId });

    } catch (error) {
        // Логируем системную ошибку
        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_USERS.actions.SERVER_ERROR.key,
            message: `Ошибка при удалении сотрудника (ID: ${targetUserId}): ${error.message}`,
            userId: currentUserId,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при удалении сотрудника',
            [{ path: 'server', message: error.message }]
        );
    }
};