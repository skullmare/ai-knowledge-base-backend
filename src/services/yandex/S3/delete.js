const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../../../../config/yandexcloud');
const { env } = require('../../../../config/env');
const { extractKeyFromUrl } = require('./url');
const logger = require('../../../utils/logger');

async function deleteSingleFileFromS3(fileUrl) {
    const key = extractKeyFromUrl(fileUrl);
    if (!key) return;

    try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: env.bucketName, Key: key }));
    } catch (error) {
        logger.error(`[S3-Delete-Error]: ${error.message}`);
    }
}

module.exports = { deleteSingleFileFromS3 };
