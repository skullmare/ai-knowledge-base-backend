const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const logger = require('../../../utils/logger');
const { s3Client } = require('../../../../config/yandexcloud');

const BUCKET = process.env.BUCKET_NAME;

const getFileKeyFromUrl = (url) => {
    const parts = url.split(`${BUCKET}/`);
    return parts.length > 1 ? parts[1] : null;
};

async function deleteSingleFileFromS3(fileUrl) {
    const key = getFileKeyFromUrl(fileUrl);
    if (!key) return;
    try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch (e) {
        logger.error(`[S3-Bulk-Delete-Error]: ${e.message}`);
    }
}

module.exports = {
    deleteSingleFileFromS3
};