const Topic = require('../../models/topic');
const KnowledgeFile = require('../../models/knowledge-file');
const { recreateCollection } = require('../../services/qdrant/recreate-collection');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

/**
 * Пересоздание векторной коллекции после смены модели эмбеддингов.
 * Операция необратима: все векторы удаляются, темы возвращаются на проверку,
 * файлы помечаются как невекторизованные.
 */
module.exports = async (req, res) => {
    const userId = req.user?.id;

    try {
        const { collection, vectorSize } = await recreateCollection();

        const [topics, files] = await Promise.all([
            Topic.updateMany(
                { 'vectorData.isIndexed': true },
                { $set: { status: 'review', 'vectorData.isIndexed': false } }
            ),
            KnowledgeFile.updateMany(
                { 'vectorData.isIndexed': true },
                { $set: { status: 'uploaded', 'vectorData.isIndexed': false, 'vectorData.chunksCount': 0 } }
            ),
        ]);

        await logHandler({
            action: ACTIONS_CONFIG.SYSTEM_SETTINGS.actions.UPDATE.key,
            message: `Векторная коллекция ${collection} пересоздана (размерность ${vectorSize})`,
            userId,
            status: 'success',
        });

        return successHandler(res, 200, 'Векторная коллекция пересоздана', {
            collection,
            vectorSize,
            resetTopics: topics.modifiedCount,
            resetFiles: files.modifiedCount,
        });
    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.SYSTEM_SETTINGS.actions.UPDATE.key,
            message: `Ошибка пересоздания векторной коллекции: ${error.message}`,
            userId,
            status: 'error',
        });

        return errorHandler(res, 500, 'Не удалось пересоздать векторную коллекцию', [
            { path: 'server', message: error.message },
        ]);
    }
};
