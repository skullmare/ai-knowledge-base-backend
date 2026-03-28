const PlatformUser = require('../../models/platform-user');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    try {
        const user = await PlatformUser.findById(req.user.id).populate('role');
        
        if (!user) {
            return errorHandler(res, 404, 'Пользователь не найден', [
                { path: 'id', message: 'Профиль не существует' }
            ]);
        }

        return successHandler(res, 200, 'Данные профиля получены', user);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.AUTH.actions.SERVER_ERROR.key,
            message: `Ошибка получения профиля: ${error.message}`,
            userId: req.user?.id,
            status: 'error'
        });

        return errorHandler(res, 500, 'Ошибка сервера', [
            { path: 'server', message: error.message }
        ]);
    }
};