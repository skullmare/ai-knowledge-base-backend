const KnowledgeFile = require('../../models/knowledge-file');
const { updateFileRolesInQdrant } = require('../../services/qdrant/sync-file');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');
const logger = require('../../utils/logger');

/** Переименование файла и управление ролями доступа. */
module.exports = async (req, res) => {
    const { id } = req.validatedData.params;
    const { name, accessibleByRoles } = req.validatedData.body;
    const userId = req.user?.id;

    try {
        const file = await KnowledgeFile.findById(id);

        if (!file) {
            return errorHandler(res, 404, 'Файл не найден', [{ path: 'id', message: 'Файл не найден' }]);
        }

        if (name !== undefined) file.name = name;
        if (accessibleByRoles !== undefined) file.accessibleByRoles = accessibleByRoles;
        file.updatedBy = userId;

        await file.save();

        // Векторы уже в базе — синхронизируем права доступа без пересчёта эмбеддингов
        if (accessibleByRoles !== undefined && file.vectorData?.isIndexed) {
            try {
                await updateFileRolesInQdrant(file._id, accessibleByRoles);
            } catch (error) {
                logger.error(`Не удалось обновить роли файла ${id} в Qdrant`, null, error.message);
            }
        }

        await file.populate('accessibleByRoles', 'name');
        await file.populate('createdBy', 'firstName lastName photoUrl');

        await logHandler({
            action: ACTIONS_CONFIG.FILES.actions.UPDATE.key,
            message: `Файл "${file.name}" обновлён`,
            userId,
            entityId: file._id,
            status: 'success',
        });

        return successHandler(res, 200, 'Файл обновлён', file);
    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.FILES.actions.SERVER_ERROR.key,
            message: `Ошибка при обновлении файла ${id}: ${error.message}`,
            userId,
            entityId: id,
            status: 'error',
        });

        return errorHandler(res, 500, 'Ошибка сервера при обновлении файла', [
            { path: 'server', message: error.message },
        ]);
    }
};
