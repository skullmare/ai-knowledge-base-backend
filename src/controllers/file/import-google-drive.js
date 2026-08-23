const KnowledgeFile = require('../../models/knowledge-file');
const { getDriveFileMeta } = require('../../services/google/list-files');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

/**
 * Подключает файл Google Drive к базе знаний.
 * Содержимое не копируется — оно скачивается на лету при векторизации.
 */
module.exports = async (req, res) => {
    const userId = req.user?.id;

    try {
        const { fileId, name, accessibleByRoles = [] } = req.validatedData.body;

        const existing = await KnowledgeFile.findOne({ source: 'google_drive', 'google.fileId': fileId });
        if (existing) {
            return errorHandler(res, 409, 'Файл уже добавлен в базу знаний', [
                { path: 'fileId', message: `Файл "${existing.name}" уже подключён` },
            ]);
        }

        const meta = await getDriveFileMeta(fileId);

        if (meta.isFolder) {
            return errorHandler(res, 400, 'Нельзя добавить папку', [
                { path: 'fileId', message: 'Выберите файл, а не директорию' },
            ]);
        }

        const file = await KnowledgeFile.create({
            name: name || meta.name,
            originalName: meta.name,
            source: 'google_drive',
            google: {
                fileId: meta.id,
                mimeType: meta.mimeType,
                webViewLink: meta.webViewLink,
                iconLink: meta.iconLink,
                size: meta.size,
                modifiedTime: meta.modifiedTime,
            },
            accessibleByRoles,
            status: 'uploaded',
            createdBy: userId,
        });

        await file.populate('accessibleByRoles', 'name');
        await file.populate('createdBy', 'firstName lastName photoUrl');

        await logHandler({
            action: ACTIONS_CONFIG.GOOGLE_DRIVE.actions.IMPORT.key,
            message: `Файл "${file.name}" подключён из Google Drive`,
            userId,
            status: 'success',
        });

        return successHandler(res, 201, 'Файл из Google Drive добавлен в базу знаний', file);
    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.GOOGLE_DRIVE.actions.SERVER_ERROR.key,
            message: `Ошибка подключения файла Google Drive: ${error.message}`,
            userId,
            status: 'error',
        });

        return errorHandler(res, 500, 'Ошибка подключения файла Google Drive', [
            { path: 'server', message: error.message },
        ]);
    }
};
