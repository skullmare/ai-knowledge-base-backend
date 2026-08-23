const {
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');
const crypto = require('crypto');
const { s3Client } = require('../../../../config/yandexcloud');

const BUCKET = process.env.BUCKET_NAME;
const PART_URL_EXPIRES_IN = 60 * 60; // 1 час на загрузку одной части

const buildKey = (originalName) => {
    const extension = path.extname(originalName).toLowerCase();
    const fileId = crypto.randomUUID();
    return `uploads/${fileId.substring(0, 2)}/${fileId.substring(2, 4)}/${fileId}${extension}`;
};

const publicUrl = (key) => `https://storage.yandexcloud.net/${BUCKET}/${key}`;

/**
 * Инициирует multipart-загрузку. Файл идёт напрямую в S3, минуя бэкенд.
 *
 * @param {{ isPublic?: boolean }} options — публичные объекты (аватары, картинки
 *   в редакторе) доступны по прямой ссылке; документы базы знаний — только по
 *   подписанной ссылке.
 */
async function createMultipartUpload(originalName, mimeType, { isPublic = false } = {}) {
    const key = buildKey(originalName);

    const { UploadId } = await s3Client.send(new CreateMultipartUploadCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: mimeType || 'application/octet-stream',
        ACL: isPublic ? 'public-read' : 'private',
    }));

    return { key, uploadId: UploadId, url: publicUrl(key) };
}

/**
 * Подписывает URL для указанных номеров частей.
 * @param {number[]} partNumbers — номера частей, начиная с 1
 */
async function signUploadParts(key, uploadId, partNumbers) {
    return Promise.all(partNumbers.map(async (partNumber) => {
        const command = new UploadPartCommand({
            Bucket: BUCKET,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: PART_URL_EXPIRES_IN });
        return { partNumber, url };
    }));
}

/**
 * @param {Array<{ partNumber: number, etag: string }>} parts
 */
async function completeMultipartUpload(key, uploadId, parts) {
    const sorted = [...parts].sort((a, b) => a.partNumber - b.partNumber);

    await s3Client.send(new CompleteMultipartUploadCommand({
        Bucket: BUCKET,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
            Parts: sorted.map(({ partNumber, etag }) => ({ PartNumber: partNumber, ETag: etag })),
        },
    }));

    const head = await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));

    return {
        key,
        url: publicUrl(key),
        size: head.ContentLength,
        mimeType: head.ContentType,
    };
}

async function abortMultipartUpload(key, uploadId) {
    return s3Client.send(new AbortMultipartUploadCommand({
        Bucket: BUCKET,
        Key: key,
        UploadId: uploadId,
    }));
}

module.exports = {
    createMultipartUpload,
    signUploadParts,
    completeMultipartUpload,
    abortMultipartUpload,
};
