const { listModels } = require('../../services/ai/list-models');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

/** Список моделей, доступных по текущему ключу RouterAI. */
module.exports = async (req, res) => {
    try {
        const models = await listModels();
        return successHandler(res, 200, 'Список моделей получен', { models });
    } catch (error) {
        return errorHandler(res, 502, 'Не удалось получить список моделей RouterAI', [
            { path: 'ai_api_key', message: error.message },
        ]);
    }
};
