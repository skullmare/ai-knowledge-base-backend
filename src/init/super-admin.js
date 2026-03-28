require('dotenv').config();
const PlatformUser = require('../models/platform-user');
const PlatformRole = require('../models/platform-role');
const { hashPassword } = require('../utils/password-handler');
const logger = require('../utils/logger');

const login = process.env.LOGIN_SUPER_ADMIN;
const password = process.env.PASSWORD_SUPER_ADMIN;

const seedSuperAdmin = async () => {
    try {
        const adminPlatformRole = await PlatformRole.findOne({ name: 'Системный администратор' });

        if (!adminPlatformRole) {
            logger.error('Ошибка: Роль "Системный администратор" не найдена. Сначала запустите seedPlatformRoles!');
            return;
        }

        const adminExists = await PlatformUser.findOne({ login: login });

        if (adminExists) {
            logger.success('Аккаунт системного администратора уже существует, пропуск создания');
            return;
        }

        const hashedPassword = await hashPassword(password);

        const superAdmin = new PlatformUser({
            firstName: 'System',
            lastName: 'Administrator',
            login: login,
            email: 'admin@admin.ru',
            password: hashedPassword,
            role: adminPlatformRole._id,
            status: 'active',
            isSystem: true
        });

        await superAdmin.save();
        logger.success(`Инициализация аккаунта системного администратора успешно завершена (Логин: ${login} / Пароль: ${password})`);

    } catch (error) {
        logger.error('Ошибка при инициализации аккаунта системного администратора', null, error.message);
    }
};

module.exports = { seedSuperAdmin };