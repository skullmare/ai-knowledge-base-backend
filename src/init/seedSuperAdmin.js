require('dotenv').config(); // Загружаем переменные окружения
const User = require('../models/platformUser');
const Role = require('../models/platformRole');
const { hashPassword } = require('../utils/passwordHelper'); // Используем нашу новую утилиту

const login = process.env.LOGIN_SUPER_ADMIN;
const password = process.env.PASSWORD_SUPER_ADMIN;

const seedSuperAdmin = async () => {
    try {
        // 1. Находим системную роль
        const adminRole = await Role.findOne({ name: 'Системный администратор' });

        if (!adminRole) {
            console.error('❌ Ошибка: Роль "Системный администратор" не найдена. Сначала запустите seedRoles!');
            return;
        }

        // 2. Проверяем, существует ли уже админ
        const adminExists = await User.findOne({ login: login });

        if (adminExists) {
            console.log('ℹ️ Аккаунт системного администратора уже существует, пропуск создания');
            return;
        }

        // 3. Хешируем пароль через утилиту
        const hashedPassword = await hashPassword(password);

        // 4. Создаем пользователя
        const superAdmin = new User({
            firstName: 'System',
            lastName: 'Administrator',
            login: login, // Используем значение из env
            email: '',
            password: hashedPassword,
            role: adminRole._id, // Привязываем ID роли
            status: 'active'
        });

        await superAdmin.save();
        console.log(`✅ Инициализация аккаунта системного администратора успешно завершена (Логин: ${login} / Пароль: ${password})`);

    } catch (error) {
        console.error('❌ Ошибка при инициализации аккаунта системного администратора:', error.message);
    }
};

module.exports = { seedSuperAdmin };