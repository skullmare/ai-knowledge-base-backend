const mongoose = require('mongoose');
const { z } = require('zod');

// Базовая проверка формата ObjectId
const objectId = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Некорректный формат ID"
});

const createTopicSchema = z.object({
    name: z.string().trim().min(1, "Наименование топика обязательно"),
    content: z.string().trim().min(1, "Содержание топика обязательно"),
    metadata: z.object({
        // Проверка категории в БД
        category: objectId.refine(async (id) => {
            const exists = await mongoose.model('TopicCategory').exists({ _id: id });
            return !!exists;
        }, "Указанная категория не существует"),

        // Проверка всех ролей в БД
        accessibleByRoles: z.array(objectId)
            .min(1, "Укажите хотя бы одну роль")
            .superRefine(async (ids, ctx) => {
                const count = await mongoose.model('AgentRole').countDocuments({ _id: { $in: ids } });
                if (count !== ids.length) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Одна или несколько указанных ролей не существуют в базе",
                    });
                }
            })
    }),
    files_metadata: z.record(
        z.string(),
        z.object({
            name: z.string().trim().min(1, "Имя файла обязательно"),
            description: z.string().trim().min(1, "Описание файла обязательно")
        }).strict()
    ).optional()
});

module.exports = { createTopicSchema };