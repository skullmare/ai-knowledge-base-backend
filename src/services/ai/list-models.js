const { getAIClient, createAIClient } = require('./client');

/**
 * Список моделей, доступных по ключу RouterAI.
 * Если переданы apiKey/baseURL — используется временный клиент (проверка подключения).
 */
async function listModels({ apiKey, baseURL } = {}) {
    const client = apiKey ? createAIClient(apiKey, baseURL) : await getAIClient();

    const response = await client.models.list();
    const models = response?.data ?? [];

    return models
        .map((model) => ({
            id: model.id,
            name: model.name || model.id,
            description: model.description ?? '',
            contextLength: model.context_length ?? model.contextLength ?? null,
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
}

module.exports = { listModels };
