const PlatformRole = require('../models/platform-role'); 
const { ALL_PERMISSIONS } = require('../constants/permissions');
const logger = require('../utils/logger');

const seedPlatformRoles = async () => {
    try {
        await PlatformRole.findOneAndUpdate(
            { name: 'Системный администратор' },
            {
                name: 'Системный администратор',
                permissions: ALL_PERMISSIONS,
                isSystem: true,
                description: 'Полный доступ ко всем функциям системы'
            },
            { 
                upsert: true, 
                returnDocument: 'after',
                runValidators: true
            }
        );
        
        logger.success('Инициализация системных ролей для управления платформой успешно завершена');
    } catch (error) {
        logger.error('Ошибка при инициализации системных ролей для управления платформой', null, error.message);
    }
};

module.exports = { seedPlatformRoles };