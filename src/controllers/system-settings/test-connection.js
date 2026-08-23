const { listModels } = require('../../services/ai/list-models');
const { getEmbeddings } = require('../../services/ai/get-embeddings');
const { describeApiKey } = require('../../services/ai/client');
const { getSetting } = require('../../services/settings');
const { SETTINGS_MAP } = require('../../constants/settings');
const { EMBEDDING_MODEL } = require('../../constants/ai');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

/**
 * Проверка сохранённого подключения к RouterAI.
 *
 * Проверяется именно то, что лежит в настройках, и тем же вызовом, которым
 * идёт векторизация: раньше кнопка проверяла ключ из формы и показывала
 * «работает», пока векторизация падала на сохранённом ключе.
 */
module.exports = async (req, res) => {
    const [rawKey, baseURL] = await Promise.all([
        getSetting('ai_api_key'),
        getSetting('ai_base_url'),
    ]);

    const key = describeApiKey(rawKey);

    try {
        const models = await listModels();
        const known = models.some((model) => model.id === EMBEDDING_MODEL);

        // Список моделей — это GET без тела; векторизация уходит POST-ом,
        // поэтому проверяем именно её
        const [vector] = await getEmbeddings(['проверка подключения']);

        return successHandler(res, 200, 'Подключение к RouterAI работает', {
            baseURL,
            key,
            modelsCount: models.length,
            embeddingModel: EMBEDDING_MODEL,
            embeddingModelAvailable: known,
            embeddingDimensions: vector?.embedding?.length ?? null,
            models,
        });
    } catch (error) {
        const hint = !key.isSet
            ? `Ключ не сохранён: заполните поле «${SETTINGS_MAP.ai_api_key.name}» и нажмите «Сохранить».`
            : key.hadInvisibleChars
                ? 'В сохранённом ключе были невидимые символы — вставьте его заново.'
                : '';

        return errorHandler(res, 502, 'Не удалось подключиться к RouterAI', [
            { path: 'ai_api_key', message: `${error.message}${hint ? ` ${hint}` : ''}` },
        ]);
    }
};
