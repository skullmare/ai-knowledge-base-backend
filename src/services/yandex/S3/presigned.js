const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');
const crypto = require('crypto');
const { s3Client } = require('../../../../config/yandexcloud');

const BUCKET = process.env.BUCKET_NAME;
const EXPIRES_IN = 15 * 60; // 15 minutes

async function createPresignedUploadUrl(originalName, mimeType) {
    const extension = path.extname(originalName).toLowerCase();
    const fileId = crypto.randomUUID();
    const folder1 = fileId.substring(0, 2);
    const folder2 = fileId.substring(2, 4);
    const key = `uploads/${folder1}/${folder2}/${fileId}${extension}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: mimeType || 'application/octet-stream',
        ACL: 'public-read',
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: EXPIRES_IN });

    return {
        uploadUrl,
        key,
        url: `https://storage.yandexcloud.net/${BUCKET}/${key}`,
        expiresIn: EXPIRES_IN,
    };
}

/**
 * Ссылка на скачивание/просмотр приватного объекта.
 * @param {{ inline?: boolean, filename?: string }} options
 */
async function createPresignedDownloadUrl(key, { inline = false, filename } = {}) {
    const disposition = inline ? 'inline' : 'attachment';
    const safeName = filename ? filename.replace(/["\\]/g, '') : path.basename(key);

    const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ResponseContentDisposition: `${disposition}; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: EXPIRES_IN });

    return { url, expiresIn: EXPIRES_IN };
}

module.exports = { createPresignedUploadUrl, createPresignedDownloadUrl };
