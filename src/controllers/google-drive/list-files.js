const KnowledgeFile = require('../../models/knowledge-file');
const { listDriveFiles, getFolderPath } = require('../../services/google/list-files');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

/**
 * Содержимое папки Google Drive.
 * К каждому файлу добавляется признак, подключён ли он уже к базе знаний.
 */
module.exports = async (req, res) => {
    try {
        const { folderId = 'root', search, pageToken } = req.validatedData.query;

        const [{ files, nextPageToken }, breadcrumbs] = await Promise.all([
            listDriveFiles({ folderId, search, pageToken }),
            search ? Promise.resolve([]) : getFolderPath(folderId),
        ]);

        const driveIds = files.filter(f => !f.isFolder).map(f => f.id);
        const linked = await KnowledgeFile.find({
            source: 'google_drive',
            'google.fileId': { $in: driveIds },
        }).select('name google.fileId status vectorData.isIndexed').lean();

        const linkedMap = new Map(linked.map(item => [item.google.fileId, item]));

        const enriched = files.map((file) => {
            const match = linkedMap.get(file.id);
            return {
                ...file,
                knowledgeFileId: match?._id ?? null,
                isLinked: Boolean(match),
                isIndexed: Boolean(match?.vectorData?.isIndexed),
            };
        });

        return successHandler(res, 200, 'Содержимое Google Drive получено', {
            files: enriched,
            breadcrumbs,
            nextPageToken,
        });
    } catch (error) {
        return errorHandler(res, 502, 'Не удалось получить файлы Google Drive', [
            { path: 'google_drive', message: error.message },
        ]);
    }
};
