const User = require('../../models/platformUser');
const { hashPassword } = require('../../utils/passwordHandler');
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');
const logHandler = require('../../utils/logHandler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentUserId = req.user?.id;

    const { id } = req.validatedData.params;
    const data = req.validatedData.body;

    try {
        if (data.password) {
            data.password = await hashPassword(data.password);
        }

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: data },
            { returnDocument: 'after' }
        );

        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_USERS.actions.UPDATE.key,
            message: `Обновлены данные сотрудника: ${updatedUser.login}`,
            userId: currentUserId,
            entityId: updatedUser._id,
            status: 'success'
        });

        const responseData = updatedUser.toObject();
        delete responseData.password;

        return successHandler(res, 200, 'Данные сотрудника успешно обновлены', responseData);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_USERS.actions.SERVER_ERROR.key,
            message: `Ошибка при обновлении сотрудника (ID: ${id}): ${error.message}`,
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