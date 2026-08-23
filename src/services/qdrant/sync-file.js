const crypto = require('crypto');
const { qdrantClient } = require('../../../config/qdrant');
const { deleteFileFromQdrant } = require('./delete-chunk');
const { getEmbeddings } = require('../ai/get-embeddings');

const COLLECTION = process.env.COLLECTION_NAME || 'knowledge_base';

/**
 * Кладёт чанки файла в векторную базу, предварительно удалив прошлые.
 * @param {import('mongoose').Document} file — документ KnowledgeFile
 * @param {string[]} chunks — текстовые фрагменты файла
 * @returns {Promise<number>} количество загруженных точек
 */
async function syncFileToQdrant(file, chunks) {
    const fileId = file._id.toString();

    await deleteFileFromQdrant(fileId);

    if (!chunks.length) return 0;

    const embeddings = await getEmbeddings(chunks);

    const roleIds = (file.accessibleByRoles || []).map(role => (role._id ?? role).toString());

    const points = embeddings.map((item, i) => ({
        id: crypto.randomUUID(),
        vector: item.embedding,
        payload: {
            text: chunks[i],
            metadata: {
                source: file.source === 'google_drive' ? 'google_drive' : 'file',
                fileId,
                name: file.name,
                link: file.source === 'google_drive' ? file.google?.webViewLink : file.storage?.url,
                accessibleByRoles: roleIds,
            }
        }
    }));

    await qdrantClient.upsert(COLLECTION, { wait: true, points });

    return points.length;
}

/** Точечное обновление ролей доступа без пересчёта эмбеддингов. */
async function updateFileRolesInQdrant(fileId, roleIds) {
    return qdrantClient.setPayload(COLLECTION, {
        wait: true,
        // key указывает вложенный путь — остальные поля metadata сохраняются
        key: 'metadata',
        payload: { accessibleByRoles: roleIds.map(String) },
        filter: {
            must: [{ key: 'metadata.fileId', match: { value: fileId.toString() } }]
        }
    });
}

module.exports = { syncFileToQdrant, updateFileRolesInQdrant };
