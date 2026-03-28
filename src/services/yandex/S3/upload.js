const { PutObjectCommand } = require("@aws-sdk/client-s3");
const path = require('path');
const { s3Client } = require('../../../../config/yandexcloud');
const crypto = require('crypto');

const BUCKET = process.env.BUCKET_NAME;

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

module.exports = { 
    uploadSingleFile
};