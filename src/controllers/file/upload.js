const { uploadSingleFile } = require('../../services/yandex/S3/upload');

const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const userId = req.user?.id;

    try {
        if (!req.file) {
            return errorHandler(
                res, 
                400, 
                'Файл не получен', 
                [{ path: 'file', message: 'Выберите файл для загрузки' }]
            );
        }

        const result = await uploadSingleFile(req.file);

        await logHandler({
            action: ACTIONS_CONFIG.INFRASTRUCTURE.actions.FILE_UPLOAD.key,
            message: `Файл "${req.file.originalname}" успешно загружен. URL: ${result.url}`,
            userId,
            status: 'success'
        });

        return successHandler(res, 201, 'Файл успешно загружен в облако', result);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.INFRASTRUCTURE.actions.FILE_UPLOAD.key,
            message: `Ошибка при загрузке файла "${req.file?.originalname || 'unknown'}": ${error.message}`,
            userId,
            status: 'error'
        });

        return errorHandler(
            res, 
            500, 
            'Критическая ошибка загрузки', 
            [{ path: 'server', message: error.message }]
        );
    }
};