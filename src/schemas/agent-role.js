const mongoose = require('mongoose');
const { z } = require('zod');
const { objectId } = require('./common');

const roleId = objectId('Некорректный ID роли агента');

// path задаётся только для проверки на уровне объекта: внутри superRefine
// поля zod дописывает путь сам, иначе в ответе получается "name.name".
const nameIsUnique = (currentRoleId = null, path) => async (name, ctx) => {
    const query = { name: name.trim() };
    if (currentRoleId) query._id = { $ne: currentRoleId };

    if (await mongoose.model('AgentRole').exists(query)) {
        ctx.addIssue({
            code: 'custom',
            message: 'Роль пользователей агента с таким названием уже существует',
            ...(path ? { path } : {})
        });
    }
};

// Роль хранится в теме как metadata.accessibleByRoles — запрос по
// accessibleByRoles ничего не находил, и защита от удаления не работала.
const collectUsage = async (ids) => {
    const [topics, agentUsers] = await Promise.all([
        mongoose.model('Topic').countDocuments({ 'metadata.accessibleByRoles': { $in: ids } }),
        mongoose.model('AgentUser').countDocuments({ role: { $in: ids } })
    ]);

    return { topics, agentUsers };
};

const addUsageIssues = ({ topics, agentUsers }, ctx, path) => {
    if (topics > 0) {
        ctx.addIssue({
            code: 'custom',
            path,
            message: `Нельзя удалить роль: она назначена темам (${topics} шт.)`
        });
    }

    if (agentUsers > 0) {
        ctx.addIssue({
            code: 'custom',
            path,
            message: `Нельзя удалить роль: она назначена пользователям агента (${agentUsers} шт.)`
        });
    }
};

const createAgentRoleSchema = z.object({
    body: z.object({
        name: z.string('Название роли обязательно')
            .trim()
            .min(1, 'Название роли не может быть пустым')
            .max(50, 'Название роли не может быть более 50 символов')
            .superRefine(nameIsUnique()),
        description: z.string('Описание роли обязательно')
            .trim()
            .min(1, 'Описание роли не может быть пустым')
            .max(1000, 'Описание роли не может быть более 1000 символов')
    })
});

const updateAgentRoleSchema = z.object({
    params: z.object({ id: roleId }),
    body: z.object({
        name: z.string().trim().min(1, 'Название роли не может быть пустым').max(50, 'Название роли не может быть более 50 символов').optional(),
        description: z.string().trim().min(1, 'Описание роли не может быть пустым').max(1000, 'Описание роли не может быть более 1000 символов').optional()
    })
}).superRefine(async (data, ctx) => {
    if (!mongoose.Types.ObjectId.isValid(data.params.id)) return;

    if (!(await mongoose.model('AgentRole').exists({ _id: data.params.id }))) {
        ctx.addIssue({ code: 'custom', path: ['params', 'id'], message: 'Роль для пользователей агента не найдена' });
        return;
    }

    if (data.body.name) await nameIsUnique(data.params.id, ['body', 'name'])(data.body.name, ctx);
});

const deleteAgentRoleSchema = z.object({
    params: z.object({ id: roleId })
}).superRefine(async (data, ctx) => {
    if (!mongoose.Types.ObjectId.isValid(data.params.id)) return;

    if (!(await mongoose.model('AgentRole').exists({ _id: data.params.id }))) {
        ctx.addIssue({ code: 'custom', path: ['params', 'id'], message: 'Роль для пользователей агента не найдена' });
        return;
    }

    addUsageIssues(await collectUsage([data.params.id]), ctx, ['params', 'id']);
});

const deleteAgentRoleListSchema = z.object({
    body: z.object({
        ids: z.array(roleId).min(1, 'Список ID не может быть пустым')
    })
}).superRefine(async (data, ctx) => {
    const { ids } = data.body;
    const found = await mongoose.model('AgentRole').countDocuments({ _id: { $in: [...new Set(ids)] } });

    if (found !== new Set(ids).size) {
        ctx.addIssue({ code: 'custom', path: ['body', 'ids'], message: 'Некоторые роли не найдены' });
        return;
    }

    addUsageIssues(await collectUsage(ids), ctx, ['body', 'ids']);
});

const getOneAgentRoleSchema = z.object({
    params: z.object({ id: roleId })
});

const getAllAgentRolesSchema = z.object({
    query: z.object({ search: z.string().trim().optional() })
});

module.exports = {
    createAgentRoleSchema,
    updateAgentRoleSchema,
    deleteAgentRoleSchema,
    deleteAgentRoleListSchema,
    getOneAgentRoleSchema,
    getAllAgentRolesSchema
};
