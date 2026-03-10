const Role = require('../models/platformRole'); 
const { ALL_PERMISSIONS } = require('../constants/permissions');

const seedRoles = async () => {
    try {
        await Role.findOneAndUpdate(
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
        
        console.log('✅ Инициализация системных ролей для управления платформой успешно завершена');
    } catch (error) {
        console.error('❌ Ошибка при инициализации системных ролей для управления платформой:', error.message);
    }
};

module.exports = { seedRoles };