const KnowledgeFile = require('../../models/knowledge-file');
const { vectorizeFile, devectorizeFile } = require('../../services/knowledge-file/vectorize');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

const loadFile = async (id) => KnowledgeFile.findById(id).populate('accessibleByRoles', 'name');

const vectorize = async (req, res) => {
    const { id } = req.validatedData.params;
    const userId = req.user?.id;

    try {
        const file = await loadFile(id);

        if (!file) {
            return errorHandler(res, 404, 'Файл не найден', [{ path: 'id', message: 'Файл не найден' }]);
        }

        if (!file.accessibleByRoles?.length) {
            return errorHandler(res, 400, 'Не выбраны роли доступа', [
                { path: 'accessibleByRoles', message: 'Укажите хотя бы одну роль пользователя агента' },
            ]);
        }

        const chunksCount = await vectorizeFile(file);
        file.updatedBy = userId;
        await file.save();

        await logHandler({
            action: ACTIONS_CONFIG.FILES.actions.VECTORIZE.key,
            message: `Файл "${file.name}" векторизован (${chunksCount} фрагментов)`,
            userId,
            entityId: file._id,
            status: 'success',
        });

        return successHandler(res, 200, 'Файл векторизован', file);
    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.FILES.actions.SERVER_ERROR.key,
            message: `Ошибка векторизации файла ${id}: ${error.message}`,
            userId,
            entityId: id,
            status: 'error',
        });

        return errorHandler(res, 500, 'Ошибка векторизации файла', [
            { path: 'server', message: error.message },
        ]);
    }
};

const devectorize = async (req, res) => {
    const { id } = req.validatedData.params;
    const userId = req.user?.id;

    try {
        const file = await loadFile(id);

        if (!file) {
            return errorHandler(res, 404, 'Файл не найден', [{ path: 'id', message: 'Файл не найден' }]);
        }

        await devectorizeFile(file);
        file.updatedBy = userId;
        await file.save();

        await logHandler({
            action: ACTIONS_CONFIG.FILES.actions.DEVECTORIZE.key,
            message: `Файл "${file.name}" удалён из векторной базы`,
            userId,
            entityId: file._id,
            status: 'success',
        });

        return successHandler(res, 200, 'Файл удалён из векторной базы', file);
    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.FILES.actions.SERVER_ERROR.key,
            message: `Ошибка удаления файла ${id} из векторной базы: ${error.message}`,
            userId,
            entityId: id,
            status: 'error',
        });

        return errorHandler(res, 500, 'Ошибка удаления файла из векторной базы', [
            { path: 'server', message: error.message },
        ]);
    }
};

module.exports = { vectorize, devectorize };
