const User = require('../../models/platformUser');
const { updateMeSchema } = require('../../schemas/profile.schema');
const { deleteSingleFileFromS3 } = require('../../services/storage.service');
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');
const logHandler = require('../../utils/logHandler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const userId = req.user?.id;
    const { body: data, userInstance: user } = req.validatedData;

    try {
        const update = {};
        const changeSummary = [];

        if (data.photoUrl !== undefined && data.photoUrl !== user.photoUrl) {
            if (user.photoUrl) {
                await deleteSingleFileFromS3(user.photoUrl);
                changeSummary.push('avatar_replaced');
            } else {
                changeSummary.push('avatar_added');
            }
            update.photoUrl = data.photoUrl;
        }

        const textFields = ['firstName', 'lastName', 'login', 'email'];
        textFields.forEach(field => {
            if (data[field] !== undefined && data[field] !== user[field]) {
                update[field] = data[field];
                changeSummary.push(field);
            }
        });

        if (Object.keys(update).length === 0) {
            return successHandler(res, 200, 'Изменений не обнаружено', user);
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: update },
            { returnDocument: 'after', runValidators: true }
        ).populate('role');

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