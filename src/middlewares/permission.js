const PlatformUser = require('../models/platform-user');
const errorHandler = require('../utils/error-handler');

const checkPermission = (required) => async (req, res, next) => {
    try {
        const requiredList = Array.isArray(required) ? required : [required];
        const user = await PlatformUser.findById(req.user?.id).populate('role', 'permissions').lean();
        const granted = user?.role?.permissions;

        if (!granted) {
            return errorHandler(res, 403, 'Доступ запрещен', [
                { path: 'role', message: 'Роль или права пользователя не определены' }
            ]);
        }

        if (!requiredList.every(permission => granted.includes(permission))) {
            return errorHandler(res, 403, 'Недостаточно прав', [
                { path: 'permissions', message: `Требуются права: ${requiredList.join(', ')}` }
            ]);
        }

        return next();
    } catch (error) {
        return errorHandler(res, 500, 'Ошибка проверки прав', [
            { path: 'server', message: error.message }
        ]);
    }
};

module.exports = checkPermission;
