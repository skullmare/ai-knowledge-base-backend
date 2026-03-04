// controllers/user.controller.js
const User = require('../../models/platformUser');

class UserController {
    async getUsers(req, res, next) {
        try {
            // Находим всех пользователей, исключая пароль
            // Также подтягиваем данные о роли
            const users = await User.find()
                .populate('role')
                .sort({ createdAt: -1 }); // Новые сверху

            return res.json(users);
        } catch (e) {
            return res.status(500).json({ message: 'Ошибка при получении списка пользователей' });
        }
    }
}

module.exports = new UserController();