const SystemSetting = require('../../models/system-setting');
const { SETTINGS_DEFINITIONS, SETTINGS_MAP } = require('../../constants/settings');
const logger = require('../../utils/logger');

const CACHE_TTL_MS = 15_000;

/**
 * Строка из одних пробелов — это «не задано»: иначе ключ из пробелов проходит
 * проверку на непустоту и уезжает в провайдера пустым заголовком.
 */
const isBlank = (value) =>
    value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

let cache = null;
let cachedAt = 0;

const defaultFor = (key) => {
    const definition = SETTINGS_MAP[key];
    if (!definition) return undefined;
    const fromEnv = definition.envFallback ? process.env[definition.envFallback] : undefined;
    return fromEnv || definition.value;
};

const invalidateSettingsCache = () => {
    cache = null;
    cachedAt = 0;
};

/**
 * Все настройки в виде плоской карты key → value.
 * Ключи, которых ещё нет в базе, заполняются значениями по умолчанию.
 */
const getSettingsMap = async () => {
    if (cache && Date.now() - cachedAt < CACHE_TTL_MS) return cache;

    const map = {};
    for (const { key } of SETTINGS_DEFINITIONS) {
        map[key] = defaultFor(key);
    }

    try {
        const rows = await SystemSetting.find().lean();
        for (const row of rows) {
            // Пустое значение в базе не должно затирать дефолт (кроме секретов —
            // там пустая строка означает «ключ не задан»)
            if (isBlank(row.value) && !SETTINGS_MAP[row.key]?.isSecret) continue;
            map[row.key] = typeof row.value === 'string' ? row.value.trim() : row.value;
        }
    } catch (error) {
        logger.error('Не удалось прочитать системные настройки, используются значения по умолчанию', null, error.message);
    }

    cache = map;
    cachedAt = Date.now();
    return map;
};

const getSetting = async (key, fallback) => {
    const map = await getSettingsMap();
    const value = map[key];
    if (isBlank(value)) {
        return fallback !== undefined ? fallback : defaultFor(key);
    }
    return value;
};

const getNumberSetting = async (key, fallback) => {
    const value = Number(await getSetting(key, fallback));
    return Number.isFinite(value) ? value : fallback;
};

/**
 * Массовое обновление настроек.
 * @param {Object} entries — карта key → value
 */
const updateSettings = async (entries) => {
    const keys = Object.keys(entries);
    if (!keys.length) return [];

    const operations = keys.map((key) => {
        const definition = SETTINGS_MAP[key];
        const raw = entries[key];
        // Обрезаем пробелы на входе: ключи и адреса почти всегда копируют
        // вместе с ними, а пробел в конце ломает заголовок авторизации
        const value = typeof raw === 'string' ? raw.trim() : raw;

        return {
            updateOne: {
                filter: { key },
                update: {
                    $set: {
                        value,
                        name: definition?.name ?? key,
                        group: definition?.group,
                        isSecret: Boolean(definition?.isSecret),
                        description: definition?.description,
                    }
                },
                upsert: true,
            }
        };
    });

    await SystemSetting.bulkWrite(operations);
    invalidateSettingsCache();

    return keys;
};

module.exports = {
    isBlank,
    getSettingsMap,
    getSetting,
    getNumberSetting,
    updateSettings,
    invalidateSettingsCache,
    defaultFor,
};
