const { getDriveClient } = require('./client');

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const FIELDS = 'nextPageToken, files(id, name, mimeType, size, iconLink, webViewLink, modifiedTime, parents)';

const escapeQuery = (value) => value.replace(/['\\]/g, '\\$&');

/**
 * Содержимое папки Google Drive (или результаты поиска по всему диску).
 *
 * @param {Object} options
 * @param {string} [options.folderId='root']
 * @param {string} [options.search] — если задан, ищем по всему диску, игнорируя папку
 * @param {string} [options.pageToken]
 * @param {number} [options.pageSize=100]
 */
async function listDriveFiles({ folderId = 'root', search, pageToken, pageSize = 100 } = {}) {
    const drive = await getDriveClient();

    const conditions = ['trashed = false'];
    if (search) {
        conditions.push(`name contains '${escapeQuery(search)}'`);
    } else {
        conditions.push(`'${escapeQuery(folderId)}' in parents`);
    }

    const { data } = await drive.files.list({
        q: conditions.join(' and '),
        fields: FIELDS,
        pageSize,
        pageToken,
        orderBy: 'folder,name',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });

    const files = (data.files ?? []).map((file) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        isFolder: file.mimeType === FOLDER_MIME,
        size: file.size ? Number(file.size) : null,
        iconLink: file.iconLink ?? null,
        webViewLink: file.webViewLink ?? null,
        modifiedTime: file.modifiedTime ?? null,
    }));

    return { files, nextPageToken: data.nextPageToken ?? null };
}

/** Хлебные крошки от корня до текущей папки. */
async function getFolderPath(folderId) {
    if (!folderId || folderId === 'root') return [{ id: 'root', name: 'Мой диск' }];

    const drive = await getDriveClient();
    const path = [];
    let currentId = folderId;

    // Ограничиваем глубину, чтобы битые ссылки на родителей не зациклили обход
    for (let depth = 0; depth < 20 && currentId && currentId !== 'root'; depth += 1) {
        const { data } = await drive.files.get({
            fileId: currentId,
            fields: 'id, name, parents',
            supportsAllDrives: true,
        });

        path.unshift({ id: data.id, name: data.name });
        currentId = data.parents?.[0];
    }

    path.unshift({ id: 'root', name: 'Мой диск' });
    return path;
}

async function getDriveFileMeta(fileId) {
    const drive = await getDriveClient();

    const { data } = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, iconLink, webViewLink, modifiedTime',
        supportsAllDrives: true,
    });

    return {
        id: data.id,
        name: data.name,
        mimeType: data.mimeType,
        isFolder: data.mimeType === FOLDER_MIME,
        size: data.size ? Number(data.size) : null,
        iconLink: data.iconLink ?? null,
        webViewLink: data.webViewLink ?? null,
        modifiedTime: data.modifiedTime ?? null,
    };
}

module.exports = { listDriveFiles, getFolderPath, getDriveFileMeta, FOLDER_MIME };
