const { getObjectBuffer } = require('../yandex/S3/get-object');
const { downloadDriveFile } = require('../google/download-file');
const { extractChunks } = require('../extractor');
const { syncFileToQdrant } = require('../qdrant/sync-file');
const { deleteFileFromQdrant } = require('../qdrant/delete-chunk');

/** Забирает содержимое файла из его источника. */
async function loadFileContent(file) {
    if (file.source === 'google_drive') {
        return downloadDriveFile(file.google.fileId, {
            name: file.originalName || file.name,
            mimeType: file.google.mimeType,
        });
    }

    const { buffer, mimeType } = await getObjectBuffer(file.storage.key);
    return {
        buffer,
        mimeType: mimeType || file.storage.mimeType,
        filename: file.originalName || file.name,
    };
}

/**
 * Полный цикл векторизации: скачать → разобрать на чанки → загрузить в Qdrant.
 * Статус документа обновляется по ходу, ошибки сохраняются в vectorData.error.
 */
async function vectorizeFile(file) {
    file.status = 'indexing';
    file.vectorData = { ...(file.vectorData?.toObject?.() ?? file.vectorData ?? {}), error: undefined };
    await file.save();

    try {
        const { buffer, mimeType, filename } = await loadFileContent(file);
        const chunks = await extractChunks(buffer, filename, mimeType);
        const chunksCount = await syncFileToQdrant(file, chunks);

        file.status = 'indexed';
        file.vectorData = {
            isIndexed: true,
            lastIndexedAt: new Date(),
            chunksCount,
            error: undefined,
        };
        await file.save();

        return chunksCount;
    } catch (error) {
        file.status = 'error';
        file.vectorData = {
            ...(file.vectorData?.toObject?.() ?? file.vectorData ?? {}),
            isIndexed: false,
            error: error.message,
        };
        await file.save();

        throw error;
    }
}

/** Убирает файл из векторной базы, сам файл при этом сохраняется. */
async function devectorizeFile(file) {
    await deleteFileFromQdrant(file._id);

    file.status = 'uploaded';
    file.vectorData = {
        isIndexed: false,
        lastIndexedAt: file.vectorData?.lastIndexedAt,
        chunksCount: 0,
        error: undefined,
    };
    await file.save();
}

module.exports = { vectorizeFile, devectorizeFile, loadFileContent };
