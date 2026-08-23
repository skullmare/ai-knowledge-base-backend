const crypto = require('crypto');
const { qdrantClient } = require('../../../config/qdrant');
const { deleteFileFromQdrant } = require('./delete-chunk');
const { getEmbeddings } = require('../ai/get-embeddings');
const { EMBEDDING_LIMITS } = require('../../constants/ai');

const COLLECTION = process.env.COLLECTION_NAME || 'knowledge_base';

const stage = async (label, fn) => {
    try {
        return await fn();
    } catch (error) {
        throw new Error(`${label}: ${error.message}`, { cause: error });
    }
};

/**
 * Кладёт сегменты файла в векторную базу, предварительно удалив прошлые.
 *
 * @param {import('mongoose').Document} file — документ KnowledgeFile
 * @param {{ segments: Array<{input: string, text: string}> }} prepared
 * @returns {Promise<number>} количество загруженных точек
 */
async function syncFileToQdrant(file, { segments }) {
    const fileId = file._id.toString();

    await stage('Qdrant', () => deleteFileFromQdrant(fileId));

    if (!segments.length) return 0;

    const embeddings = await stage(
        'Векторизация',
        () => getEmbeddings(segments.map((s) => s.input), { batchSize: EMBEDDING_LIMITS.TEXT_BATCH })
    );

    const roleIds = (file.accessibleByRoles || []).map((role) => (role._id ?? role).toString());
    const link = file.source === 'google_drive' ? file.google?.webViewLink : file.storage?.url;

    const points = embeddings.map((item, i) => ({
        id: crypto.randomUUID(),
        vector: item.embedding,
        payload: {
            text: segments[i].text,
            metadata: {
                source: file.source === 'google_drive' ? 'google_drive' : 'file',
                fileId,
                name: file.name,
                link,
                accessibleByRoles: roleIds,
            }
        }
    }));

    await stage('Qdrant', () => qdrantClient.upsert(COLLECTION, { wait: true, points }));

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
