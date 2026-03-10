require('dotenv').config();
const User = require('../models/platformUser');
const Role = require('../models/platformRole');
const { hashPassword } = require('../utils/passwordHandler');

const login = process.env.LOGIN_SUPER_ADMIN;
const password = process.env.PASSWORD_SUPER_ADMIN;

const seedSuperAdmin = async () => {
    try {
        const adminRole = await Role.findOne({ name: 'Системный администратор' });

        if (!adminRole) {
            console.error('❌ Ошибка: Роль "Системный администратор" не найдена. Сначала запустите seedRoles!');
            return;
        }

        const adminExists = await User.findOne({ login: login });

        if (adminExists) {
            console.log('ℹ️ Аккаунт системного администратора уже существует, пропуск создания');
            return;
        }

        const hashedPassword = await hashPassword(password);

        const superAdmin = new User({
            firstName: 'System',
            lastName: 'Administrator',
            login: login,
            email: '',
            password: hashedPassword,
            role: adminRole._id,
            status: 'active',
            isSystem: true
        });

        await superAdmin.save();
        console.log(`✅ Инициализация аккаунта системного администратора успешно завершена (Логин: ${login} / Пароль: ${password})`);

    } catch (error) {
        console.error('❌ Ошибка при инициализации аккаунта системного администратора:', error.message);
    }
};

module.exports = { seedSuperAdmin };