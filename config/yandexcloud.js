const { S3Client } = require("@aws-sdk/client-s3");

// Инициализация S3 клиента для Yandex Cloud
const s3Client = new S3Client({
    region: "ru-central1",
    endpoint: "https://storage.yandexcloud.net",
    credentials: {
        accessKeyId: process.env.YANDEX_ACCESS_KEY_ID,
        secretAccessKey: process.env.YANDEX_SECRET_ACCESS_KEY,
    }
});

module.exports = { s3Client };