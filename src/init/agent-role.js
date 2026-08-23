const AgentRole = require('../models/agent-role');
const logger = require('../utils/logger');

const seedAgentRoles = async () => {
    const roles = [
        { name: 'Застройщик', description: 'Роль для доступа к ИИ агенту от имени застройщика' },
        { name: 'Партнер', description: 'Роль для доступа к ИИ агенту от имени партнера' }
    ];

    try {
        for (const role of roles) {
            await AgentRole.findOneAndUpdate(
                { name: role.name },
                {
                    name: role.name,
                    description: role.description
                },
                { upsert: true, returnDocument: 'after', runValidators: true }
            );
        }
        logger.success('Инициализация базовых ролей для доступа к ИИ агенту успешно завершена');
    } catch (error) {
        logger.error('Ошибка при инициализации базовых ролей для доступа к ИИ агенту', null, error.message || error);
    }
};

module.exports = { seedAgentRoles };