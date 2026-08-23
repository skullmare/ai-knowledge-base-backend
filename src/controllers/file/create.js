const KnowledgeFile = require('../../models/knowledge-file');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

/** Регистрирует уже загруженный в хранилище файл как элемент базы знаний. */
module.exports = async (req, res) => {
    const userId = req.user?.id;

    try {
        const { name, originalName, key, url, size, mimeType, accessibleByRoles = [] } = req.validatedData.body;

        const file = await KnowledgeFile.create({
            name,
            originalName: originalName || name,
            source: 'storage',
            storage: { key, url, size, mimeType },
            accessibleByRoles,
            status: 'uploaded',
            createdBy: userId,
        });

        await file.populate('accessibleByRoles', 'name');
        await file.populate('createdBy', 'firstName lastName photoUrl');

        await logHandler({
            action: ACTIONS_CONFIG.FILES.actions.CREATE.key,
            message: `Файл "${file.name}" добавлен в базу знаний`,
            userId,
            entityId: file._id,
            status: 'success',
        });

        return successHandler(res, 201, 'Файл добавлен в базу знаний', file);
    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.FILES.actions.SERVER_ERROR.key,
            message: `Ошибка при добавлении файла: ${error.message}`,
            userId,
            status: 'error',
        });

        return errorHandler(res, 500, 'Ошибка сервера при добавлении файла', [
            { path: 'server', message: error.message },
        ]);
    }
};
