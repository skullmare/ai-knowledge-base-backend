const { z } = require('zod');
const { objectId, dbExists, dbAllExist, paginationQuery } = require('./common');

const topicId = objectId('Некорректный ID темы').pipe(
    z.string().superRefine(dbExists('Topic', 'Тема не найдена'))
);

const metadataSchema = z.object({
    category: objectId('Некорректный ID категории').pipe(
        z.string('Категория темы обязательна').superRefine(dbExists('TopicCategory', 'Категория не найдена'))
    ),
    accessibleByRoles: z
        .array(objectId('Некорректный ID роли'), 'Роли должны быть массивом')
        .min(1, 'Укажите хотя бы одну роль')
        .pipe(z.array(z.string()).superRefine(dbAllExist('AgentRole', 'Одна или несколько ролей не найдены')))
});

const nameField = z
    .string('Наименование темы обязательно')
    .trim()
    .min(1, 'Наименование темы не может быть пустым')
    .max(150, 'Наименование темы не может быть более 150 символов');

const createTopicSchema = z.object({
    body: z.object({
        name: nameField,
        metadata: metadataSchema
    })
});

const patchTopicSchema = z.object({
    params: z.object({ id: topicId }),
    body: z.object({
        name: nameField.optional(),
        metadata: metadataSchema.partial().optional(),
        status: z.enum(['review', 'archived'], 'Недопустимый статус. Доступны: review, archived').optional()
    })
});

const getTopicsSchema = z.object({
    query: z.object({
        ...paginationQuery(10),
        search: z.string().trim().optional(),
        category: objectId('Некорректный ID категории').optional(),
        role: objectId('Некорректный ID роли').optional(),
        status: z.enum(['review', 'approved', 'archived'], 'Некорректный статус для фильтрации').optional()
    })
});

const getOneTopicSchema = z.object({ params: z.object({ id: topicId }) });
const deleteTopicSchema = z.object({ params: z.object({ id: topicId }) });

module.exports = {
    createTopicSchema,
    patchTopicSchema,
    getTopicsSchema,
    getOneTopicSchema,
    deleteTopicSchema
};
