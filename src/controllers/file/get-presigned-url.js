const { createPresignedUploadUrl } = require('../../services/yandex/S3/presigned');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    try {
        const { originalName, mimeType } = req.body;

        if (!originalName) {
            return errorHandler(res, 400, 'Не указано имя файла', [
                { path: 'originalName', message: 'Обязательное поле' },
            ]);
        }

        const result = await createPresignedUploadUrl(originalName, mimeType);

        return successHandler(res, 200, 'Presigned URL сгенерирован', result);
    } catch (error) {
        return errorHandler(res, 500, 'Ошибка генерации URL', [
            { path: 'server', message: error.message },
        ]);
    }
};
