const { PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const logger = require('../utils/logger');
const path = require('path');
const { s3Client } = require('../../config/yandexcloud');
const crypto = require('crypto');

const BUCKET = process.env.BUCKET_NAME;

const getFileKeyFromUrl = (url) => {
    const parts = url.split(`${BUCKET}/`);
    return parts.length > 1 ? parts[1] : null;
};

async function uploadSingleFile(file) {
    const extension = path.extname(file.originalname).toLowerCase();
    
    const fileId = crypto.randomUUID(); 
    
    const folder1 = fileId.substring(0, 2);
    const folder2 = fileId.substring(2, 4);
    
    const key = `uploads/${folder1}/${folder2}/${fileId}${extension}`;

    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/octet-stream',
        ACL: 'public-read'
    }));

    return {
        url: `https://storage.yandexcloud.net/${BUCKET}/${key}`,
        fileType: file.mimetype,
        originalName: file.originalname
    };
}

async function deleteSingleFileFromS3(fileUrl) {
    const key = getFileKeyFromUrl(fileUrl);
    if (!key) return;
    try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch (e) {
        logger.error(`[S3-Bulk-Delete-Error]: ${e.message}`);
    }
}

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
    uploadSingleFile, 
    deleteSingleFileFromS3,
    deleteMultipleFilesFromS3
};