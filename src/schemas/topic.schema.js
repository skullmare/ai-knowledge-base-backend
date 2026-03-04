const mongoose = require('mongoose');
const { z } = require('zod');

const objectIdSchema = z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val), 
    { message: "Некорректный формат ID" }
);

const existsInDb = (modelName, message) => async (id) => {
    if (!id) return true;
    const exists = await mongoose.model(modelName).exists({ _id: id });
    return !!exists;
};

const rolesExistValidator = async (ids, ctx) => {
    if (!ids || ids.length === 0) return;
    const uniqueIds = [...new Set(ids)];
    const count = await mongoose.model('AgentRole').countDocuments({ _id: { $in: uniqueIds } });
    
    if (count !== uniqueIds.length) {
        ctx.addIssue({
            code: 'custom',
            message: "Одна или несколько указанных ролей не найдены",
            fatal: true
        });
    }
};

const createTopicSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1, "Наименование топика обязательно"),
        content: z.string().trim().min(1, "Содержание топика обязательно"),
        metadata: z.object({
            category: objectIdSchema.refine(
                existsInDb('TopicCategory'), 
                "Указанная категория не существует"
            ),
            accessibleByRoles: z.array(objectIdSchema)
                .min(1, "Укажите хотя бы одну роль")
                .superRefine(rolesExistValidator)
        }),
        files_metadata: z.record(
            z.string(),
            z.object({
                name: z.string().trim().min(1, "Имя файла обязательно"),
                description: z.string().trim().min(1, "Описание файла обязательно")
            }).strict()
        ).optional()
    })
});

const patchTopicSchema = z.object({
    params: z.object({
        id: objectIdSchema
    }),
    body: z.object({
        name: z.string().trim().min(1, "Наименование обязательно").optional(),
        content: z.string().trim().min(1, "Содержание обязательно").optional(),
        metadata: z.object({
            category: objectIdSchema
                .optional()
                .refine(existsInDb('TopicCategory'), "Указанная категория не существует"),
            accessibleByRoles: z.array(objectIdSchema)
                .min(1, "Должна быть хотя бы одна роль")
                .optional()
                .superRefine(rolesExistValidator)
        }).optional(),
        filesToDelete: z.array(
            z.string().trim().startsWith(`https://storage.yandexcloud.net/${process.env.BUCKET_NAME}`, {
                message: "URL должен принадлежать вашему хранилищу S3"
            })
        ).optional(),
        files_metadata: z.record(
            z.string(),
            z.object({
                name: z.string().trim().min(1, "Имя файла обязательно"),
                description: z.string().trim().min(1, "Описание файла обязательно")
            })
        ).optional()
    })
});

const getTopicsSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).default("1"),
        limit: z.string().regex(/^\d+$/).transform(Number).default("10"),
        search: z.string().optional(),
        category: objectIdSchema.optional(),
        status: z.enum(['published', 'review', 'draft']).optional()
    })
});

const getOneTopicSchema = z.object({
    params: z.object({
        id: objectIdSchema
    })
});

const deleteTopicSchema = z.object({
    params: z.object({
        id: objectIdSchema.refine(
            existsInDb('Topic'), 
            "Топик с таким ID не найден"
        )
    })
});

module.exports = {
    createTopicSchema,
    deleteTopicSchema,
    patchTopicSchema,
    getTopicsSchema,
    getOneTopicSchema
};