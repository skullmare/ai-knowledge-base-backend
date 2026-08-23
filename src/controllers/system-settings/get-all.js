const { getSettingsMap } = require('../../services/settings');
const { SETTINGS_DEFINITIONS, READONLY_KEYS } = require('../../constants/settings');
const { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } = require('../../constants/ai');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

/**
 * Настройки для интерфейса. Секретные значения наружу не отдаются —
 * вместо них возвращается только признак «заполнено».
 */
module.exports = async (req, res) => {
    try {
        const map = await getSettingsMap();

        const settings = SETTINGS_DEFINITIONS.map(({ key, name, group, description, isSecret = false }) => {
            const value = map[key];

            return {
                key,
                name,
                group,
                description,
                isSecret,
                isReadonly: READONLY_KEYS.includes(key),
                hasValue: value !== undefined && value !== null && value !== '',
                value: isSecret ? null : value,
            };
        });

        // Модель эмбеддингов не настраивается: смена модели означает пересоздание
        // всей векторной базы. Отдаём её как справочное значение
        const fixed = {
            embeddingModel: EMBEDDING_MODEL,
            embeddingDimensions: EMBEDDING_DIMENSIONS,
        };

        return successHandler(res, 200, 'Системные настройки получены', { settings, fixed });
    } catch (error) {
        return errorHandler(res, 500, 'Ошибка сервера при получении настроек', [
            { path: 'server', message: error.message },
        ]);
    }
};
