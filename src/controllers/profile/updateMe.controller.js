const User = require('../../models/platformUser');
const { updateMeSchema } = require('../../schemas/profile.schema');
const { deleteSingleFileFromS3 } = require('../../services/storage.service');
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');
const logHandler = require('../../utils/logHandler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const userId = req.user?.id;

    try {
        // 1. Валидация входных данных (включая проверку существования юзера и уникальность логина/email)
        const validation = await updateMeSchema.safeParseAsync({ 
            userId: userId, 
            body: req.body 
        });

        if (!validation.success) {
            return errorHandler(
                res,
                400,
                'Ошибка валидации данных профиля',
                validation.error.issues.map(err => ({
                    // Очищаем путь от префикса 'body', чтобы клиент видел чистые названия полей
                    path: err.path.filter(p => p !== 'body').join('.'),
                    message: err.message
                }))
            );
        }

        // Извлекаем данные из валидации: тело запроса и уже найденный инстанс пользователя
        const { body: data, userInstance: user } = validation.data;

        const update = {};
        const changeSummary = [];

        // 2. Обработка смены аватарки и удаления старой из S3
        // Проверяем именно data.photoUrl, так как в body это опциональное поле
        if (data.photoUrl !== undefined && data.photoUrl !== user.photoUrl) {
            if (user.photoUrl) {
                await deleteSingleFileFromS3(user.photoUrl);
                changeSummary.push('avatar_replaced');
            } else {
                changeSummary.push('avatar_added');
            }
            update.photoUrl = data.photoUrl;
        }

        // 3. Обработка остальных текстовых полей
        const textFields = ['firstName', 'lastName', 'login', 'email'];
        textFields.forEach(field => {
            if (data[field] !== undefined && data[field] !== user[field]) {
                update[field] = data[field];
                changeSummary.push(field);
            }
        });

        // Если изменений нет
        if (Object.keys(update).length === 0) {
            return successHandler(res, 200, 'Изменений не обнаружено', user);
        }

        // 4. Сохранение изменений
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: update },
            { returnDocument: 'after', runValidators: true }
        ).populate('role');

        // 5. Логирование (PROFILE_UPDATE)
        await logHandler({
            action: ACTIONS_CONFIG.PROFILE.actions.UPDATE.key,
            message: `Обновление профиля. Изменены поля: ${changeSummary.join(', ')}`,
            userId,
            entityId: userId,
            status: 'success'
        });

        return successHandler(res, 200, 'Профиль успешно обновлен', updatedUser);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.PROFILE.actions.SERVER_ERROR.key,
            message: `Ошибка сервера при обновлении профиля ${userId}: ${error.message}`,
            userId,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при обновлении профиля',
            [{ path: 'server', message: error.message }]
        );
    }
};