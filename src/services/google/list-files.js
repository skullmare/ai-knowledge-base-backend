const { getDriveClient, getRootFolderMeta } = require('./client');

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const FIELDS = 'nextPageToken, files(id, name, mimeType, size, iconLink, webViewLink, modifiedTime, parents)';

const escapeQuery = (value) => value.replace(/['\\]/g, '\\$&');

/**
 * Содержимое папки Google Drive (или результаты поиска по всему диску).
 * Если folderId не передан, листинг идёт от корневой папки, расшаренной
 * сервисному аккаунту.
 *
 * @param {Object} options
 * @param {string} [options.folderId] — по умолчанию корневая папка из настроек
 * @param {string} [options.search] — если задан, ищем по всему диску, игнорируя папку
 * @param {string} [options.pageToken]
 * @param {number} [options.pageSize=100]
 */
async function listDriveFiles({ folderId, search, pageToken, pageSize = 100 } = {}) {
    const drive = await getDriveClient();
    const rootMeta = await getRootFolderMeta();
    // Интерфейс может явно присылать folderId=root — для service account это
    // должен быть его корень из настроек, а не пустой «Мой диск» самого SA.
    const targetFolderId = (!folderId || folderId === 'root') ? rootMeta.id : folderId;

    const conditions = ['trashed = false'];
    const params = {
        fields: FIELDS,
        pageSize,
        pageToken,
        orderBy: 'folder,name',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    };

    if (search) {
        conditions.push(`name contains '${escapeQuery(search)}'`);
    } else if (targetFolderId === rootMeta.id && rootMeta.driveId && rootMeta.driveId === rootMeta.id) {
        // Корень общего диска (Shared Drive) нельзя перечислить через parents —
        // для него используется выборка по driveId.
        params.driveId = rootMeta.driveId;
        params.corpora = 'drive';
    } else {
        conditions.push(`'${escapeQuery(targetFolderId)}' in parents`);
    }

    params.q = conditions.join(' and ');

    const { data } = await drive.files.list(params);

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

/**
 * Хлебные крошки от корневой папки до текущей.
 * Выше корня не поднимаемся: родитель расшаренной папки сервисному аккаунту
 * обычно недоступен.
 */
async function getFolderPath(folderId) {
    const rootMeta = await getRootFolderMeta();
    const targetId = (!folderId || folderId === 'root') ? rootMeta.id : folderId;

    if (targetId === rootMeta.id) {
        return [{ id: rootMeta.id, name: rootMeta.name }];
    }

    const drive = await getDriveClient();
    const path = [];
    let currentId = targetId;

    // Ограничиваем глубину, чтобы битые ссылки на родителей не зациклили обход
    for (let depth = 0; depth < 20 && currentId && currentId !== rootMeta.id && currentId !== 'root'; depth += 1) {
        let data;
        try {
            ({ data } = await drive.files.get({
                fileId: currentId,
                fields: 'id, name, parents',
                supportsAllDrives: true,
            }));
        } catch (error) {
            // Первый элемент — сама запрошенная папка: без него путь бессмысленен
            if (depth === 0) throw error;
            break;
        }

        path.unshift({ id: data.id, name: data.name });
        currentId = data.parents?.[0];
    }

    path.unshift({ id: rootMeta.id, name: rootMeta.name });
    return path;
}

async function getDriveFileMeta(fileId) {
    const drive = await getDriveClient();

    const { data } = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, iconLink, webViewLink, modifiedTime, driveId',
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
        driveId: data.driveId ?? null,
    };
}

module.exports = { listDriveFiles, getFolderPath, getDriveFileMeta, FOLDER_MIME };
