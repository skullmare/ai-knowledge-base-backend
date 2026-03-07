const mongoose = require('mongoose');
const { z } = require('zod');

// --- Вспомогательные функции ---

const objectId = z.string()
    .trim()
    .refine(v => mongoose.Types.ObjectId.isValid(v), "Некорректный ID");

const dbExists = (modelName) => async (id, ctx) => {
    const exists = await mongoose.model(modelName).exists({ _id: id });
    if (!exists) ctx.addIssue({ code: 'custom', message: `${modelName} не найден` });
};

const dbAllExist = (modelName) => async (ids, ctx) => {
    const uniqueIds = [...new Set(ids)];
    const count = await mongoose.model(modelName).countDocuments({ _id: { $in: uniqueIds } });
    if (count !== uniqueIds.length) {
        ctx.addIssue({ code: 'custom', message: `Одна или несколько записей в ${modelName} не найдены` });
    }
};

// --- Подсхемы ---

const categorySchema = objectId.pipe(
    z.string().superRefine(dbExists('TopicCategory'))
);

const rolesSchema = z.array(objectId)
    .min(1, "Укажите хотя бы одну роль")
    .pipe(z.array(z.string()).superRefine(dbAllExist('AgentRole')));

const metadataSchema = z.object({
    category: categorySchema,
    accessibleByRoles: rolesSchema
});

const fileSchema = z.object({
    name: z.string().trim().min(1, "Имя файла обязательно"),
    description: z.string().trim().min(1, "Описание файла обязательно"),
    url: z.string().url("Некорректная ссылка"),
    fileType: z.string().optional()
});

// --- Основные схемы ---

const createTopicSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1, "Наименование топика обязательно"),
        content: z.string().trim().min(1, "Контент топика обязателен"),
        metadata: metadataSchema,
        files: z.array(fileSchema).optional()
    })
});

const patchTopicSchema = z.object({
    params: z.object({ 
        id: objectId.pipe(z.string().superRefine(dbExists('Topic'))) 
    }),
    body: z.object({
        name: z.string().trim().min(1).optional(),
        content: z.string().trim().min(1).optional(),
        metadata: metadataSchema.partial().optional(),
        files: z.array(fileSchema).optional(),
        filesToDelete: z.array(z.string().url()).optional()
    })
});

const getTopicsSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).default("1"),
        limit: z.string().regex(/^\d+$/).transform(Number).default("10"),
        search: z.string().optional(),
        category: objectId.optional(),
        status: z.enum(['review', 'approved', 'archived']).optional()
    })
});

const getOneTopicSchema = z.object({ 
    params: z.object({ 
        id: objectId.pipe(z.string().superRefine(dbExists('Topic'))) 
    }) 
});

const deleteTopicSchema = z.object({ 
    params: z.object({ 
        id: objectId.pipe(z.string().superRefine(dbExists('Topic'))) 
    }) 
});

module.exports = { 
    createTopicSchema, 
    patchTopicSchema, 
    getTopicsSchema,
    getOneTopicSchema,
    deleteTopicSchema
};