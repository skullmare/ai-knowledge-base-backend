const path = require('path');
const crypto = require('crypto');
const { env } = require('../../../../config/env');

const PUBLIC_HOST = 'https://storage.yandexcloud.net';

const buildPublicUrl = (key) => `${PUBLIC_HOST}/${env.bucketName}/${key}`;

// Ключ шардируется по первым символам UUID, чтобы в бакете
// не скапливались десятки тысяч объектов в одной «папке».
const buildObjectKey = (originalName) => {
    const extension = path.extname(originalName || '').toLowerCase();
    const fileId = crypto.randomUUID();

    return `uploads/${fileId.slice(0, 2)}/${fileId.slice(2, 4)}/${fileId}${extension}`;
};

const extractKeyFromUrl = (url) => {
    const marker = `/${env.bucketName}/`;
    const index = String(url || '').indexOf(marker);

    return index === -1 ? null : String(url).slice(index + marker.length) || null;
};

module.exports = { buildPublicUrl, buildObjectKey, extractKeyFromUrl };
