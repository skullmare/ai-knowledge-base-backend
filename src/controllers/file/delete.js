const KnowledgeFile = require('../../models/knowledge-file');
const { deleteFileFromQdrant } = require('../../services/qdrant/delete-chunk');
const { deleteSingleFileFromS3 } = require('../../services/yandex/S3/delete');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');
const logger = require('../../utils/logger');

module.exports = async (req, res) => {
    const { id } = req.validatedData.params;
    const userId = req.user?.id;

    try {
        const file = await KnowledgeFile.findById(id);

        if (!file) {
            return errorHandler(res, 404, 'Файл не найден', [{ path: 'id', message: 'Файл не найден' }]);
        }

        // Чистим внешние хранилища до удаления записи — иначе останутся «сироты»
        try {
            await deleteFileFromQdrant(file._id);
        } catch (error) {
            logger.error(`Не удалось удалить векторы файла ${id}`, null, error.message);
        }

        if (file.source === 'storage' && file.storage?.url) {
            await deleteSingleFileFromS3(file.storage.url);
        }

        await file.deleteOne();

        await logHandler({
            action: ACTIONS_CONFIG.FILES.actions.DELETE.key,
            message: `Файл "${file.name}" удалён из базы знаний`,
            userId,
            entityId: file._id,
            status: 'success',
        });

        return successHandler(res, 200, 'Файл удалён', { _id: file._id });
    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.FILES.actions.SERVER_ERROR.key,
            message: `Ошибка при удалении файла ${id}: ${error.message}`,
            userId,
            entityId: id,
            status: 'error',
        });

        return errorHandler(res, 500, 'Ошибка сервера при удалении файла', [
            { path: 'server', message: error.message },
        ]);
    }
};
