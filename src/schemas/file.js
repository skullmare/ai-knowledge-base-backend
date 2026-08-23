const { z } = require('zod');

const originalName = z
    .string('Имя файла обязательно')
    .trim()
    .min(1, 'Имя файла не может быть пустым')
    .max(255, 'Имя файла не может быть более 255 символов');

const mimeType = z
    .string()
    .trim()
    .max(255, 'Некорректный MIME-тип')
    .optional();

const presignedUrlSchema = z.object({
    body: z.object({ originalName, mimeType })
});

const confirmUploadSchema = z.object({
    body: z.object({
        // Ключ формируется сервером в createPresignedUploadUrl;
        // жёсткий шаблон не даёт подтвердить произвольный объект в бакете.
        key: z
            .string('Ключ файла обязателен')
            .trim()
            .regex(/^uploads\/[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f-]{36}(\.[A-Za-z0-9]{1,10})?$/, 'Некорректный ключ файла'),
        originalName: originalName.optional(),
        mimeType
    })
});

module.exports = { presignedUrlSchema, confirmUploadSchema };
