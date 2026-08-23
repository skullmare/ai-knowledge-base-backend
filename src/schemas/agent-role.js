const mongoose = require('mongoose');
const { z } = require('zod');

const objectId = z
    .string()
    .trim()
    .refine(v => mongoose.Types.ObjectId.isValid(v), "Некорректный ID роли агента");

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

const createAgentRoleSchema = z.object({
    body: z.object({
        name: z.string("Название роли обязательно")
            .trim()
            .min(1, "Название роли не может быть пустым")
            .max(50, "Название роли не может быть более 50 символов")
            .superRefine(agentRoleNameIsUnique()),
        description: z.string("Описание роли обязательно")
            .trim()
            .min(1, "Описание роли не может быть пустым")
            .max(1000, "Описание роли не может быть более 1000 символов")
    })
});

const updateAgentRoleSchema = z.object({
    params: z.object({
        id: objectId
    }),
    body: z.object({
        name: z.string().trim().min(1).max(100).optional(),
        description: z.string().trim().min(1).max(1000).optional()
    })
}).pipe(
    z.object({
        params: z.object({ id: z.string() }),
        body: z.object({
            name: z.string().optional(),
            description: z.string().optional()
        })
    }).superRefine(async (data, ctx) => {
        const role = await mongoose.model('AgentRole').findById(data.params.id);
        
        if (!role) {
            ctx.addIssue({ 
                code: 'custom', 
                path: ['params', 'id'], 
                message: 'Роль для пользователей агента не найдена' 
            });
            return;
        }

        if (data.body.name) {
            await agentRoleNameIsUnique(data.params.id)(data.body.name, ctx);
        }
    })
);

const deleteAgentRoleSchema = z.object({
    params: z.object({
        id: objectId
    })
}).pipe(
    z.object({
        params: z.object({ id: z.string() }) 
    }).superRefine(async (data, ctx) => {
        const role = await mongoose.model('AgentRole').findById(data.params.id);
        
        if (!role) {
            ctx.addIssue({ 
                code: 'custom', 
                path: ['params', 'id'], 
                message: 'Роль для пользователей агента не найдена' 
            });
            return;
        }

        const count = await mongoose.model('Topic').countDocuments({ 
            accessibleByRoles: data.params.id 
        });

        if (count > 0) {
            ctx.addIssue({
                code: 'custom',
                path: ['params', 'id'],
                message: `Нельзя удалить роль "${role.name}", так как она назначена топикам (${count} шт.).`
            });
        }
    })
);


const deleteAgentRoleListSchema = z.object({
    body: z.object({
        ids: z.array(objectId).min(1, "Список ID не может быть пустым")
    })
}).pipe(
    z.object({
        body: z.object({ ids: z.array(z.string()) })
    }).superRefine(async (data, ctx) => {
        const { ids } = data.body;
        const AgentRole = mongoose.model('AgentRole');
        const Topic = mongoose.model('Topic');

        const roles = await AgentRole.find({ _id: { $in: ids } });
        
        if (roles.length !== ids.length) {
            ctx.addIssue({
                code: 'custom',
                path: ['ids'],
                message: 'Некоторые роли не найдены'
            });
            return;
        }

        const usedInTopics = await Topic.find({ 
            accessibleByRoles: { $in: ids } 
        }).populate('accessibleByRoles', 'name');

        if (usedInTopics.length > 0) {
            const problematicNames = [...new Set(usedInTopics.flatMap(t => 
                t.accessibleByRoles.filter(r => ids.includes(r._id.toString())).map(r => r.name)
            ))].join(', ');

            ctx.addIssue({
                code: 'custom',
                path: ['ids'],
                message: `Нельзя удалить роли (${problematicNames}), так как они назначены топикам.`
            });
        }
    })
);

const getOneAgentRoleSchema = z.object({
    params: z.object({
        id: objectId
    })
});

const getAllAgentRolesSchema = z.object({
    query: z.object({
        search: z.string().trim().optional()
    })
});

module.exports = {
    createAgentRoleSchema,
    updateAgentRoleSchema,
    deleteAgentRoleSchema,
    getOneAgentRoleSchema,
    getAllAgentRolesSchema,
    deleteAgentRoleListSchema
};