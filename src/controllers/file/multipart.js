const {
    createMultipartUpload,
    signUploadParts,
    completeMultipartUpload,
    abortMultipartUpload,
} = require('../../services/yandex/S3/multipart');

const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

const create = async (req, res) => {
    try {
        const { originalName, mimeType, visibility } = req.validatedData.body;
        const result = await createMultipartUpload(originalName, mimeType, {
            isPublic: visibility === 'public',
        });

        return successHandler(res, 201, 'Multipart-загрузка инициирована', result);
    } catch (error) {
        return errorHandler(res, 500, 'Не удалось начать загрузку файла', [
            { path: 'server', message: error.message },
        ]);
    }
};

const sign = async (req, res) => {
    try {
        const { key, uploadId, partNumbers } = req.validatedData.body;
        const parts = await signUploadParts(key, uploadId, partNumbers);

        return successHandler(res, 200, 'Ссылки для загрузки частей получены', { parts });
    } catch (error) {
        return errorHandler(res, 500, 'Не удалось подписать части файла', [
            { path: 'server', message: error.message },
        ]);
    }
};

const complete = async (req, res) => {
    const userId = req.user?.id;

    try {
        const { key, uploadId, parts, originalName } = req.validatedData.body;
        const result = await completeMultipartUpload(key, uploadId, parts);

        await logHandler({
            action: ACTIONS_CONFIG.INFRASTRUCTURE.actions.FILE_UPLOAD.key,
            message: `Файл "${originalName || key}" загружен в хранилище (multipart, ${parts.length} ч.)`,
            userId,
            status: 'success',
        });

        return successHandler(res, 200, 'Файл успешно загружен', { ...result, originalName });
    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.INFRASTRUCTURE.actions.FILE_UPLOAD.key,
            message: `Ошибка завершения загрузки файла "${req.body?.originalName || req.body?.key}": ${error.message}`,
            userId,
            status: 'error',
        });

        return errorHandler(res, 500, 'Не удалось завершить загрузку файла', [
            { path: 'server', message: error.message },
        ]);
    }
};

const abort = async (req, res) => {
    try {
        const { key, uploadId } = req.validatedData.body;
        await abortMultipartUpload(key, uploadId);

        return successHandler(res, 200, 'Загрузка отменена', { key });
    } catch (error) {
        return errorHandler(res, 500, 'Не удалось отменить загрузку', [
            { path: 'server', message: error.message },
        ]);
    }
};

module.exports = { create, sign, complete, abort };
