const User = require('../../models/platformUser');
const { hashPassword } = require('../../utils/passwordHandler');
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');
const logHandler = require('../../utils/logHandler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentUserId = req.user?.id;
    const data = req.validatedData.body;

    try {
        const hashedPassword = await hashPassword(data.password);

        const newUser = await User.create({
            ...data,
            password: hashedPassword
        });

        await logHandler({
            action: ACTIONS_CONFIG.PLATFORM_USERS.actions.CREATE.key,
            message: `Создан новый сотрудник: ${newUser.login} (${newUser.firstName} ${newUser.lastName})`,
            userId: currentUserId,
            entityId: newUser._id,
            status: 'success'
        });

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