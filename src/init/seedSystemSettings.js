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
        // Используем Promise.all для параллельной проверки, 
        // но можно и обычный цикл, если данных мало.
        for (const setting of defaultSettings) {
            // Используем upsert: если нет — создаст, если есть — НЕ изменит (setDefaultsOnInsert)
            // Это самый надежный способ избежать дублей в Mongo
            await SystemSetting.findOneAndUpdate(
                { key: setting.key },
                { $setOnInsert: setting },
                {
                    upsert: true,
                    returnDocument: 'after', // Исправлено здесь
                    setDefaultsOnInsert: true
                }
            );
        }

        console.log('✅ Инициализация системных настроек успешно завершена');
    } catch (error) {
        console.error('❌ Ошибка при сидировании настроек:', error);
        throw error; // Пробрасываем ошибку выше в startServer
    }
};

module.exports = { seedSystemSettings };