const { PutObjectCommand, DeleteObjectsCommand, DeleteObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const path = require('path');
const { s3Client } = require('../../config/yandexcloud');

const BUCKET = process.env.BUCKET_NAME;

const getFileKeyFromUrl = (url) => {
    const parts = url.split(`${BUCKET}/`);
    return parts.length > 1 ? parts[1] : null;
};

async function uploadFileToYandex(file, fileInfo, topicId) {
    const extension = path.extname(file.originalname);
    const key = `topics/${topicId}/${Date.now()}_${Math.floor(Math.random() * 1000)}${extension}`;

    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/octet-stream',
        ACL: 'public-read'
    }));

    return {
        name: fileInfo.name,
        description: fileInfo.description,
        url: `https://storage.yandexcloud.net/${BUCKET}/${key}`,
        fileType: file.mimetype
    };
}

async function processTopicFiles(files, filesMetadataMap, topicId) {
    if (!files?.length) return [];
    return Promise.all(files.map(file => uploadFileToYandex(file, filesMetadataMap[file.originalname], topicId)));
}

async function deleteTopicFiles(topicId) {
    const prefix = `topics/${topicId}/`;
    const listed = await s3Client.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }));

    if (!listed.Contents?.length) return;

    return s3Client.send(new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: {
            Objects: listed.Contents.map(({ Key }) => ({ Key })),
            Quiet: true
        }
    }));
}

async function deleteSingleFileFromS3(fileUrl) {
    const key = getFileKeyFromUrl(fileUrl);
    if (!key) return;

    try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch (e) {
        // Логируем, но не кидаем ошибку выше, чтобы не прерывать основной процесс
        console.error(`[S3-Delete-Error]: ${fileUrl}`, e.message);
    }
}

module.exports = { processTopicFiles, deleteTopicFiles, deleteSingleFileFromS3 };