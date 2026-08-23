const { DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const logger = require('../../../utils/logger');
const { s3Client } = require('../../../../config/yandexcloud');

const BUCKET = process.env.BUCKET_NAME;

const getFileKeyFromUrl = (url) => {
    const parts = url.split(`${BUCKET}/`);
    return parts.length > 1 ? parts[1] : null;
};

async function deleteMultipleFilesFromS3(urls) {
    if (!urls || !urls.length) return;

    const keys = urls
        .map(url => getFileKeyFromUrl(url))
        .filter(key => key !== null);

    if (!keys.length) return;

    try {
        await s3Client.send(new DeleteObjectsCommand({
            Bucket: BUCKET,
            Delete: {
                Objects: keys.map(key => ({ Key: key })),
                Quiet: true
            }
        }));
    } catch (e) {
        logger.error(`[S3-Bulk-Delete-Error]: ${e.message}`);
    }
}

module.exports = {
    deleteMultipleFilesFromS3
};