const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client } = require('../../../../config/yandexcloud');
const { env } = require('../../../../config/env');
const { buildObjectKey, buildPublicUrl } = require('./url');

const EXPIRES_IN = 15 * 60;

async function createPresignedUploadUrl(originalName, mimeType) {
    const key = buildObjectKey(originalName);

    const uploadUrl = await getSignedUrl(
        s3Client,
        new PutObjectCommand({
            Bucket: env.bucketName,
            Key: key,
            ContentType: mimeType || 'application/octet-stream',
            ACL: 'public-read'
        }),
        { expiresIn: EXPIRES_IN }
    );

    return { uploadUrl, key, url: buildPublicUrl(key), expiresIn: EXPIRES_IN };
}

module.exports = { createPresignedUploadUrl };
