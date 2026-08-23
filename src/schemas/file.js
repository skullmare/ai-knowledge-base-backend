const mongoose = require('mongoose');
const { z } = require('zod');

const objectId = z.string()
    .trim()
    .refine(v => mongoose.Types.ObjectId.isValid(v), 'Некорректный ID');

const agentRoleIds = z.array(objectId)
    .default([])
    .superRefine(async (ids, ctx) => {
        if (!ids.length) return;

        const found = await mongoose.model('AgentRole').countDocuments({ _id: { $in: ids } });
        if (found !== new Set(ids).size) {
            ctx.addIssue({
                code: 'custom',
                path: ['accessibleByRoles'],
                message: 'Одна или несколько ролей не найдены'
            });
        }
    });

const fileName = z.string('Название обязательно')
    .trim()
    .min(1, 'Название не может быть пустым')
    .max(255, 'Максимальная длина названия 255 символов');

// ── Multipart upload ────────────────────────────────────────────────────────

const createMultipartSchema = z.object({
    body: z.object({
        originalName: fileName,
        mimeType: z.string().trim().optional(),
        visibility: z.enum(['public', 'private']).default('private'),
    })
});

const signMultipartSchema = z.object({
    body: z.object({
        key: z.string().trim().min(1, 'Не указан ключ объекта'),
        uploadId: z.string().trim().min(1, 'Не указан идентификатор загрузки'),
        partNumbers: z.array(z.number().int().min(1).max(10000))
            .min(1, 'Список частей не может быть пустым')
            .max(1000, 'За один запрос можно подписать не более 1000 частей'),
    })
});

const completeMultipartSchema = z.object({
    body: z.object({
        key: z.string().trim().min(1, 'Не указан ключ объекта'),
        uploadId: z.string().trim().min(1, 'Не указан идентификатор загрузки'),
        originalName: z.string().trim().optional(),
        parts: z.array(z.object({
            partNumber: z.number().int().min(1),
            etag: z.string().trim().min(1, 'Не получен ETag части'),
        })).min(1, 'Нет ни одной загруженной части'),
    })
});

const abortMultipartSchema = z.object({
    body: z.object({
        key: z.string().trim().min(1, 'Не указан ключ объекта'),
        uploadId: z.string().trim().min(1, 'Не указан идентификатор загрузки'),
    })
});

// ── Файлы базы знаний ───────────────────────────────────────────────────────

const getFilesSchema = z.object({
    query: z.object({
        search: z.string().trim().optional(),
        source: z.enum(['storage', 'google_drive']).optional(),
        status: z.enum(['uploaded', 'indexing', 'indexed', 'error']).optional(),
        role: objectId.optional(),
        page: z.coerce.number().int().min(1).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional(),
    })
});

const createFileSchema = z.object({
    body: z.object({
        name: fileName,
        originalName: z.string().trim().max(255).optional(),
        key: z.string().trim().min(1, 'Не указан ключ объекта в хранилище'),
        url: z.string().trim().min(1, 'Не указан адрес файла'),
        size: z.number().nonnegative().optional(),
        mimeType: z.string().trim().optional(),
        accessibleByRoles: agentRoleIds,
    })
});

const importGoogleFileSchema = z.object({
    body: z.object({
        fileId: z.string().trim().min(1, 'Не указан файл Google Drive'),
        name: fileName.optional(),
        accessibleByRoles: agentRoleIds,
    })
});

const updateFileSchema = z.object({
    params: z.object({ id: objectId }),
    body: z.object({
        name: fileName.optional(),
        accessibleByRoles: z.array(objectId).optional(),
    }).refine(
        (body) => body.name !== undefined || body.accessibleByRoles !== undefined,
        'Не переданы поля для обновления'
    )
}).superRefine(async (data, ctx) => {
    const ids = data.body.accessibleByRoles;
    if (!ids?.length) return;

    const found = await mongoose.model('AgentRole').countDocuments({ _id: { $in: ids } });
    if (found !== new Set(ids).size) {
        ctx.addIssue({
            code: 'custom',
            path: ['body', 'accessibleByRoles'],
            message: 'Одна или несколько ролей не найдены'
        });
    }
});

const fileIdSchema = z.object({
    params: z.object({ id: objectId })
});

const getFileLinkSchema = z.object({
    params: z.object({ id: objectId }),
    query: z.object({
        inline: z.enum(['true', 'false']).optional(),
    })
});

module.exports = {
    createMultipartSchema,
    signMultipartSchema,
    completeMultipartSchema,
    abortMultipartSchema,
    getFilesSchema,
    createFileSchema,
    importGoogleFileSchema,
    updateFileSchema,
    fileIdSchema,
    getFileLinkSchema,
};
