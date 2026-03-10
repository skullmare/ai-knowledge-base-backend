const mongoose = require('mongoose');
const { z } = require('zod');

// --- Вспомогательные функции ---

/**
 * Валидация ObjectId
 */
const objectId = z
    .string()
    .trim()
    .refine(v => mongoose.Types.ObjectId.isValid(v), "Некорректный ID роли агента");

/**
 * Проверка уникальности названия роли агента
 */
const agentRoleNameIsUnique = (currentRoleId = null) => async (name, ctx) => {
    const query = { name: name.trim() };
    if (currentRoleId) {
        query._id = { $ne: currentRoleId };
    }

    const exists = await mongoose.model('AgentRole').exists(query);
    if (exists) {
        ctx.addIssue({
            code: 'custom',
            path: ['name'],
            message: 'Роль пользователей агента с таким названием уже существует'
        });
    }
};

// --- Схемы для контроллеров ---

/**
 * Схема создания роли агента
 */
const createAgentRoleSchema = z.object({
    body: z.object({
        name: z.string("Название роли обязательно")
            .trim()
            .min(1, "Название роли не может быть пустым")
            .max(100, "Название роли не может быть более 100 символов")
            .superRefine(agentRoleNameIsUnique()),
        description: z.string("Описание роли обязательно")
            .trim()
            .min(1, "Описание роли не может быть пустым")
            .max(1000, "Описание роли не может быть более 1000 символов")
    })
});

/**
 * Схема обновления роли агента
 */
const updateAgentRoleSchema = z.object({
    params: z.object({
        id: objectId
    }),
    body: z.object({
        name: z.string()
            .trim()
            .min(1, "Название роли не может быть пустым")
            .max(100, "Название роли не может быть более 100 символов")
            .optional(),
        description: z.string()
            .trim()
            .min(1, "Описание роли не может быть пустым")
            .max(1000, "Описание роли не может быть более 1000 символов")
            .optional()
    })
}).superRefine(async (data, ctx) => {
    // 1. Проверяем существование записи
    const role = await mongoose.model('AgentRole').findById(data.params.id);
    if (!role) {
        ctx.addIssue({ code: 'custom', path: ['params', 'id'], message: 'Роль для пользователей агента не найдена' });
        return;
    }

    // 2. Если имя меняется, проверяем на уникальность
    if (data.body.name) {
        await agentRoleNameIsUnique(data.params.id)(data.body.name, ctx);
    }
});

/**
 * Схема удаления роли агента (с логикой из pre-deleteOne)
 */
const deleteAgentRoleSchema = z.object({
    params: z.object({
        id: objectId
    })
}).superRefine(async (data, ctx) => {
    const role = await mongoose.model('AgentRole').findById(data.params.id);
    
    if (!role) {
        ctx.addIssue({ code: 'custom', path: ['params', 'id'], message: 'Роль для пользователей агента не найдена' });
        return;
    }

    const Topic = mongoose.model('Topic');
    const count = await Topic.countDocuments({ accessibleByRoles: data.params.id });

    if (count > 0) {
        ctx.addIssue({
            code: 'custom',
            path: ['params', 'id'],
            message: `Нельзя удалить роль "${role.name}", так как она назначена топикам (${count} шт.). Сначала уберите её из топиков.`
        });
    }
});

/**
 * Схемы получения данных
 */
const getOneAgentRoleSchema = z.object({
    params: z.object({
        id: objectId
    })
});

const getAllAgentRolesSchema = z.object({
    query: z.object({
        search: z.string().trim().optional(),
        page: z.string().regex(/^\d+$/, "Номер страницы должен быть числом").transform(Number).default("1"),
        limit: z.string().regex(/^\d+$/, "Лимит должен быть числом").transform(Number).default("10")
    })
});

module.exports = {
    createAgentRoleSchema,
    updateAgentRoleSchema,
    deleteAgentRoleSchema,
    getOneAgentRoleSchema,
    getAllAgentRolesSchema
};