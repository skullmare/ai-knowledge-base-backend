const { listModels } = require('../../services/ai/list-models');
const { getSetting } = require('../../services/settings');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

/**
 * Проверка подключения к RouterAI.
 * Ключ можно передать в теле — тогда проверяется он, а не сохранённый.
 */
module.exports = async (req, res) => {
    try {
        const { apiKey, baseURL } = req.validatedData.body;

        const models = apiKey
            ? await listModels({ apiKey, baseURL: baseURL || await getSetting('ai_base_url') })
            : await listModels();

        return successHandler(res, 200, 'Подключение к RouterAI работает', {
            modelsCount: models.length,
            models,
        });
    } catch (error) {
        return errorHandler(res, 502, 'Не удалось подключиться к RouterAI', [
            { path: 'ai_api_key', message: error.message },
        ]);
    }
};
