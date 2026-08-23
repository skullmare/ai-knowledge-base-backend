const fs = require('fs');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../../../../config/yandexcloud');
const { env } = require('../../../../config/env');
const { buildObjectKey, buildPublicUrl } = require('./url');

async function uploadSingleFile(file) {
    const key = buildObjectKey(file.originalname);

    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: env.bucketName,
            Key: key,
            Body: fs.createReadStream(file.path),
            ContentType: file.mimetype || 'application/octet-stream',
            ContentLength: file.size,
            ACL: 'public-read'
        }));
    } finally {
        // Временный файл multer нужно убрать в любом случае,
        // иначе диск заполняется неудачными загрузками.
        fs.unlink(file.path, () => {});
    }

    return {
        url: buildPublicUrl(key),
        key,
        fileType: file.mimetype,
        originalName: file.originalname
    };
}

module.exports = { uploadSingleFile };
