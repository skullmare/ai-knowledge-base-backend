const User = require('../models/platformUser');

const checkPermission = (required) => {
    return async (req, res, next) => {
        try {
            const requiredArray = Array.isArray(required) ? required : [required];

            // Senior tip: Мы уже имеем данные в req.user. Если нужно актуальное состояние из БД:
            const user = await User.findById(req.user.id).populate('role').lean();
            
            if (!user?.role?.permissions) {
                return res.status(403).json({
                    success: false,
                    message: 'Доступ запрещен',
                    errors: [{ path: 'role', message: 'Роль или права пользователя не определены' }]
                });
            }

            const hasAll = requiredArray.every(p => user.role.permissions.includes(p));

            if (!hasAll) {
                return res.status(403).json({
                    success: false,
                    message: 'Недостаточно прав',
                    errors: [{ 
                        path: 'permissions', 
                        message: `Требуются права: ${requiredArray.join(', ')}` 
                    }]
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки прав',
                errors: [{ path: 'server', message: error.message }]
            });
        }
    };
};

module.exports = checkPermission;