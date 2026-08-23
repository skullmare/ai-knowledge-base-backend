const { DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../../../../config/yandexcloud');
const { env } = require('../../../../config/env');
const { extractKeyFromUrl } = require('./url');
const logger = require('../../../utils/logger');

async function deleteMultipleFilesFromS3(urls) {
    const keys = (urls || []).map(extractKeyFromUrl).filter(Boolean);
    if (!keys.length) return;

    try {
        await s3Client.send(new DeleteObjectsCommand({
            Bucket: env.bucketName,
            Delete: { Objects: keys.map(Key => ({ Key })), Quiet: true }
        }));
    } catch (error) {
        logger.error(`[S3-Bulk-Delete-Error]: ${error.message}`);
    }
}

module.exports = { deleteMultipleFilesFromS3 };
