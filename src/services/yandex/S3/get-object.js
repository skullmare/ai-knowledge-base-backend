const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../../../../config/yandexcloud');

const BUCKET = process.env.BUCKET_NAME;

/** Скачивает объект из S3 в память — используется только при векторизации. */
async function getObjectBuffer(key) {
    const response = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));

    const chunks = [];
    for await (const chunk of response.Body) {
        chunks.push(chunk);
    }

    return {
        buffer: Buffer.concat(chunks),
        mimeType: response.ContentType,
        size: response.ContentLength,
    };
}

module.exports = { getObjectBuffer };
