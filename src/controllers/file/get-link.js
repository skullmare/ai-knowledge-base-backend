const KnowledgeFile = require('../../models/knowledge-file');
const { createPresignedDownloadUrl } = require('../../services/yandex/S3/presigned');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

/**
 * Временная ссылка на файл.
 * disposition=inline — просмотр в интерфейсе, иначе скачивание.
 * Файлы Google Drive открываются по webViewLink в отдельном окне.
 */
module.exports = async (req, res) => {
    const { id } = req.validatedData.params;
    const { inline } = req.validatedData.query;

    try {
        const file = await KnowledgeFile.findById(id).lean();

        if (!file) {
            return errorHandler(res, 404, 'Файл не найден', [{ path: 'id', message: 'Файл не найден' }]);
        }

        if (file.source === 'google_drive') {
            if (!file.google?.webViewLink) {
                return errorHandler(res, 409, 'У файла нет ссылки Google Drive', [
                    { path: 'source', message: 'Файл недоступен для открытия' },
                ]);
            }

            return successHandler(res, 200, 'Ссылка получена', {
                url: file.google.webViewLink,
                external: true,
                mimeType: file.google.mimeType,
            });
        }

        if (!file.storage?.key) {
            return errorHandler(res, 409, 'У файла нет объекта в хранилище', [
                { path: 'storage', message: 'Файл недоступен для скачивания' },
            ]);
        }

        const { url, expiresIn } = await createPresignedDownloadUrl(file.storage.key, {
            inline: inline === 'true' || inline === true,
            filename: file.originalName || file.name,
        });

        return successHandler(res, 200, 'Ссылка получена', {
            url,
            external: false,
            expiresIn,
            mimeType: file.storage.mimeType,
        });
    } catch (error) {
        return errorHandler(res, 500, 'Ошибка получения ссылки на файл', [
            { path: 'server', message: error.message },
        ]);
    }
};
