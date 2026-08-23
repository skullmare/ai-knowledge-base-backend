const { OpenAI } = require('openai');
const { getSetting } = require('../settings');

let cached = { apiKey: null, baseURL: null, client: null };

// Хвостовой слеш даёт «/v1//embeddings» — часть шлюзов на это отвечает 401
const normalizeBaseURL = (value) => (value ?? '').trim().replace(/\/+$/, '');

/**
 * Из ключа выбрасываются все пробельные и невидимые символы: их приносит
 * копипаст (перенос строки, неразрывный пробел, zero-width), а API-ключ
 * не может их содержать. Строка из одних таких символов станет пустой,
 * и её поймает проверка ниже — вместо пустого заголовка Authorization.
 */
const INVISIBLE_CHARS = /[\s\u00A0\u200B-\u200D\u2060\uFEFF]/g;

const normalizeApiKey = (value) => (value ?? '').replace(INVISIBLE_CHARS, '');

/**描述 ключа для диагностики — без раскрытия самого значения. */
const describeApiKey = (raw) => {
    const original = raw ?? '';
    const normalized = normalizeApiKey(original);

    return {
        isSet: Boolean(normalized),
        length: normalized.length,
        preview: normalized ? `${normalized.slice(0, 4)}…${normalized.slice(-4)}` : null,
        hadInvisibleChars: original.length !== normalized.length,
    };
};

/**
 * OpenAI-совместимый клиент, сконфигурированный из системных настроек.
 * Клиент пересоздаётся только при смене ключа или адреса API.
 */
async function getAIClient() {
    const [rawKey, rawBaseURL] = await Promise.all([
        getSetting('ai_api_key'),
        getSetting('ai_base_url'),
    ]);

    const apiKey = normalizeApiKey(rawKey);
    const baseURL = normalizeBaseURL(rawBaseURL);

    // Проверяем именно после обрезки: ключ из одних пробелов непустой, но
    // уходит в провайдера пустым заголовком Authorization
    if (!apiKey) {
        throw new Error('Не задан API-ключ RouterAI. Укажите его в разделе «Настройки системы» → RouterAI.');
    }

    if (!baseURL) {
        throw new Error('Не задан базовый URL RouterAI. Укажите его в разделе «Настройки системы» → RouterAI.');
    }

    if (!cached.client || cached.apiKey !== apiKey || cached.baseURL !== baseURL) {
        cached = { apiKey, baseURL, client: new OpenAI({ apiKey, baseURL }) };
    }

    return cached.client;
}

/** Клиент с произвольными учётными данными — для проверки подключения из интерфейса. */
function createAIClient(apiKey, baseURL) {
    const key = normalizeApiKey(apiKey);
    if (!key) throw new Error('Не указан API-ключ RouterAI');

    return new OpenAI({ apiKey: key, baseURL: normalizeBaseURL(baseURL) || undefined });
}

function invalidateAIClient() {
    cached = { apiKey: null, baseURL: null, client: null };
}

module.exports = {
    getAIClient,
    createAIClient,
    invalidateAIClient,
    normalizeBaseURL,
    normalizeApiKey,
    describeApiKey,
};
