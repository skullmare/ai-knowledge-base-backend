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
    z.string("Категория топика обязательна").superRefine(dbExists('TopicCategory'))
);

const rolesSchema = z
    .array(objectId, "Роли должны быть массивом")
    .min(1, "Укажите хотя бы одну роль")
    .pipe(z.array(z.string()).superRefine(dbAllExist('AgentRole')));

const metadataSchema = z.object({
    category: categorySchema,
    accessibleByRoles: rolesSchema
});

const fileSchema = z.object({
    name: z
        .string('Наименование файла обязательно')
        .trim()
        .min(1, "Наименование файла не может быть пустым"),
    description: z
        .string('Описание файла обязательно')
        .trim()
        .min(1, "Описание файла не может быть пустым"),
    url: z
        .string('Поле ссылка обязательно')
        .url("Некорректный формат ссылки"),
    fileType: z.string().optional()
});

// --- Основные схемы ---

const createTopicSchema = z.object({
    body: z.object({
        name: z
            .string("Наименование топика обязательно")
            .trim()
            .min(1, "Наименование топика не может быть пустым")
            .max(150, "Наименование топика не может быть более 150 символов"),
        content: z
            .string("Содержание топика обязательно")
            .trim()
            .min(1, "Содержание топика не может быть пустым")
            .max(10000, "Содержание топика не может быть более 10000 символов"),
        metadata: metadataSchema,
        files: z.array(fileSchema).optional()
    })
});

const patchTopicSchema = z.object({
    params: z.object({ 
        id: objectId.pipe(z.string().superRefine(dbExists('Topic'))) 
    }),
    body: z.object({
        name: z
            .string()
            .trim()
            .min(1, "Наименование топика не может быть пустым")
            .max(150, "Наименование топика не может быть более 150 символов")
            .optional(),
        content: z
            .string()
            .trim()
            .min(1, "Содержание топика не может быть пустым")
            .max(10000, "Содержание топика не может быть более 10000 символов")
            .optional(),
        metadata: metadataSchema.partial().optional(),
        files: z
            .array(fileSchema)
            .optional(),
        filesToDelete: z
            .array(z.string().url("Некорректный формат ссылки"))
            .min(1, "Список удаляемых файлов не может быть пустым")
            .optional(),
        status: z
            .enum(['review', 'archived'], "Недопустимый статус. Доступны: review, archived")
            .optional()
    })
});

const getTopicsSchema = z.object({
    query: z.object({
        page: z
            .string()
            .regex(/^\d+$/, "Номер страницы должен быть числом")
            .transform(Number)
            .default("1"),
        limit: z
            .string()
            .regex(/^\d+$/, "Лимит должен быть числом")
            .transform(Number)
            .default("10"),
        search: z
            .string()
            .optional(),
        category: objectId.optional(),
        status: z
            .enum(['review', 'approved', 'archived'], "Некорректный статус для фильтрации")
            .optional()
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