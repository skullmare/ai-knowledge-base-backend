const { uploadSingleFile } = require('../../services/storage.service');

// Подключаем утилиты и конфиг
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');
const logHandler = require('../../utils/logHandler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const userId = req.user?.id;

    try {
        // 1. Проверка наличия файла в запросе
        if (!req.file) {
            // Экшена нет в ACTIONS_CONFIG — логирование пропущено
            return errorHandler(
                res, 
                400, 
                'Файл не получен', 
                [{ path: 'file', message: 'Выберите файл для загрузки' }]
            );
        }

        // 2. Загрузка в облако (S3 / Yandex Cloud)
        const result = await uploadSingleFile(req.file);

        // 3. Логирование успешной загрузки (FILE_UPLOAD)
        await logHandler({
            action: ACTIONS_CONFIG.INFRASTRUCTURE.actions.FILE_UPLOAD.key,
            message: `Файл "${req.file.originalname}" успешно загружен. URL: ${result.url}`,
            userId,
            status: 'success'
        });

        // 4. Успешный ответ
        return successHandler(res, 201, 'Файл успешно загружен в облако', result);

    } catch (error) {
        // Логируем ошибку работы с файлами
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