const { s3Client } = require('../../../config/yandexcloud');
const { HeadObjectCommand } = require('@aws-sdk/client-s3');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

const BUCKET = process.env.BUCKET_NAME;

module.exports = async (req, res) => {
    const userId = req.user?.id;

    try {
        const { key, originalName, mimeType } = req.body;

        if (!key) {
            return errorHandler(res, 400, 'Не указан ключ файла', [
                { path: 'key', message: 'Обязательное поле' },
            ]);
        }

        await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));

        const url = `https://storage.yandexcloud.net/${BUCKET}/${key}`;

        await logHandler({
            action: ACTIONS_CONFIG.INFRASTRUCTURE.actions.FILE_UPLOAD.key,
            message: `Файл "${originalName || key}" успешно загружен через presigned URL. URL: ${url}`,
            userId,
            status: 'success',
        });

        return successHandler(res, 200, 'Файл успешно загружен', {
            url,
            key,
            fileType: mimeType,
            originalName,
        });
    } catch (error) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            return errorHandler(res, 404, 'Файл не найден в хранилище', [
                { path: 'key', message: 'Файл ещё не загружен или ключ неверен' },
            ]);
        }

        await logHandler({
            action: ACTIONS_CONFIG.INFRASTRUCTURE.actions.FILE_UPLOAD.key,
            message: `Ошибка подтверждения загрузки файла "${req.body?.key}": ${error.message}`,
            userId,
            status: 'error',
        });

        return errorHandler(res, 500, 'Ошибка подтверждения загрузки', [
            { path: 'server', message: error.message },
        ]);
    }
};
