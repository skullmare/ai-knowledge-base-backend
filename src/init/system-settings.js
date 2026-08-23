const SystemSetting = require('../models/system-setting');
const { SETTINGS_DEFINITIONS } = require('../constants/settings');
const { invalidateSettingsCache } = require('../services/settings');
const logger = require('../utils/logger');

/**
 * Создаёт отсутствующие настройки со значениями по умолчанию.
 * Уже сохранённые значения не перезаписываются.
 */
const seedSystemSettings = async () => {
    try {
        // Раньше поле name было уникальным — убираем устаревший индекс,
        // иначе несколько настроек без имени конфликтуют между собой.
        try {
            await SystemSetting.collection.dropIndex('name_1');
        } catch {
            // индекса нет — это норма
        }

        for (const { key, name, group, value, isSecret = false, description, envFallback } of SETTINGS_DEFINITIONS) {
            const initialValue = (envFallback && process.env[envFallback]) || value;

            await SystemSetting.findOneAndUpdate(
                { key },
                {
                    $setOnInsert: { key, value: initialValue },
                    $set: { name, group, isSecret, description }
                },
                {
                    upsert: true,
                    returnDocument: 'after',
                    setDefaultsOnInsert: true
                }
            );
        }

        invalidateSettingsCache();
        logger.success('Инициализация системных настроек успешно завершена');
    } catch (error) {
        logger.error('Ошибка при сидировании настроек', null, error.message || error);
        throw error;
    }
};

module.exports = { seedSystemSettings };
