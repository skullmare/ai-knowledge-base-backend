const SystemSetting = require('../models/systemSetting');

const defaultSettings = [
    {
        key: 'logs_ttl_days',
        value: 30,
        group: 'logs',
        description: 'Срок хранения системных логов в днях.'
    },
    {
        key: 'ai_chat_model',
        value: 'google/gemini-3-flash-preview',
        group: 'ai',
        description: 'Основная модель для генерации ответов.'
    }
];

const seedSystemSettings = async () => {
    try {
        for (const setting of defaultSettings) {
            await SystemSetting.findOneAndUpdate(
                { key: setting.key },
                { $setOnInsert: setting },
                {
                    upsert: true,
                    returnDocument: 'after',
                    setDefaultsOnInsert: true
                }
            );
        }

        console.log('✅ Инициализация системных настроек успешно завершена');
    } catch (error) {
        console.error('❌ Ошибка при сидировании настроек:', error);
        throw error;
    }
};

module.exports = { seedSystemSettings };