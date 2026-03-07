const User = require('../../models/platformUser');
const { updateUserSchema } = require('../../schemas/user.schema');
const { hashPassword } = require('../../utils/passwordHandler');

// Подключаем утилиты и конфиг
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');
const logHandler = require('../../utils/logHandler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentUserId = req.user?.id; // ID того, кто делает запрос
    const { id: targetUserId } = req.params; // ID того, кого обновляем

    try {
        // 1. Валидация данных через Zod
        // Схема сама проверит существование User и уникальность нового login (игнорируя targetUserId)
        const validation = await updateUserSchema.safeParseAsync({ 
            params: req.params, 
            body: req.body 
        });
        
        if (!validation.success) {
            return errorHandler(
                res,
                400,
                'Ошибка валидации при обновлении',
                validation.error.issues.map(err => ({
                    path: err.path.filter(p => p !== 'body' && p !== 'params').join('.'),
                    message: err.message
                }))
            );
        }

        const { body: updateData } = validation.data;

        // 2. Если в запросе есть пароль — хешируем его
        if (updateData.password) {
            updateData.password = await hashPassword(updateData.password);
        }

        // 3. Обновление пользователя
        const updatedUser = await User.findByIdAndUpdate(
            targetUserId,
            { $set: updateData },
            { returnDocument: 'after' }
        );

        // 4. Логирование действия (PLATFORM_USER_UPDATE)
        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_USERS.actions.UPDATE.key,
            message: `Обновлены данные сотрудника: ${updatedUser.login}`,
            userId: currentUserId,
            entityId: updatedUser._id,
            status: 'success'
        });

        // Подготовка данных для ответа
        const responseData = updatedUser.toObject();
        delete responseData.password;

        return successHandler(res, 200, 'Данные сотрудника успешно обновлены', responseData);

    } catch (error) {
        // Логируем системную ошибку
        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_USERS.actions.SERVER_ERROR.key,
            message: `Ошибка при обновлении сотрудника (ID: ${targetUserId}): ${error.message}`,
            userId: currentUserId,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при обновлении сотрудника',
            [{ path: 'server', message: error.message }]
        );
    }
};