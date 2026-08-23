const { OpenAI } = require('openai');
const { getSetting } = require('../settings');

let cached = { apiKey: null, baseURL: null, client: null };

/**
 * OpenAI-совместимый клиент, сконфигурированный из системных настроек.
 * Клиент пересоздаётся только при смене ключа или адреса API.
 */
async function getAIClient() {
    const [apiKey, baseURL] = await Promise.all([
        getSetting('ai_api_key'),
        getSetting('ai_base_url'),
    ]);

    if (!apiKey) {
        throw new Error('Не задан API-ключ RouterAI. Укажите его в разделе «Настройки системы».');
    }

    if (!cached.client || cached.apiKey !== apiKey || cached.baseURL !== baseURL) {
        cached = { apiKey, baseURL, client: new OpenAI({ apiKey, baseURL }) };
    }

    return cached.client;
}

/** Клиент с произвольными учётными данными — для проверки подключения из интерфейса. */
function createAIClient(apiKey, baseURL) {
    return new OpenAI({ apiKey, baseURL });
}

function invalidateAIClient() {
    cached = { apiKey: null, baseURL: null, client: null };
}

module.exports = { getAIClient, createAIClient, invalidateAIClient };
