const { PutObjectCommand } = require("@aws-sdk/client-s3");
const path = require('path');
const { s3Client } = require('../../config/yandexcloud');

/**
 * Загрузка одного файла
 */
async function uploadFileToYandex(file, fileInfo, topicId) {
    try {
        const extension = path.extname(file.originalname);
        const safeName = Date.now() + '_' + Math.floor(Math.random() * 1000);
        const key = `topics/${topicId}/${safeName}${extension}`;

        const uploadParams = {
            Bucket: process.env.BUCKET_NAME,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype || 'application/octet-stream',
            ACL: 'public-read'
        };

        await s3Client.send(new PutObjectCommand(uploadParams));

        const permanentUrl = `https://storage.yandexcloud.net/${process.env.BUCKET_NAME}/${key}`;
        
        return {
            name: fileInfo.name,          // Красивое имя из мапы
            description: fileInfo.description, // Описание из мапы
            url: permanentUrl,
            fileType: file.mimetype
        };
    } catch (error) {
        console.error(`❌ Ошибка загрузки файла ${file.originalname}:`, error.message);
        throw error;
    }
}

/**
 * Процесс обработки всех файлов
 */
async function processTopicFiles(files, filesMetadataMap, topicId) {
    if (!files || files.length === 0) return [];
    
    const uploadPromises = files.map((file) => {
        // Мы уже провалидировали наличие данных в контроллере, так что тут просто берем
        const fileInfo = filesMetadataMap[file.originalname];
        return uploadFileToYandex(file, fileInfo, topicId);
    });

    return await Promise.all(uploadPromises);
}

module.exports = { processTopicFiles };