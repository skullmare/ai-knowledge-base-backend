const mongoose = require('mongoose');
const { z } = require('zod');

const objectId = z.string()
    .trim()
    .refine(v => mongoose.Types.ObjectId.isValid(v), "Некорректный ID");

const dbExists = (modelName) => async (id, ctx) => {
    const exists = await mongoose.model(modelName).exists({ _id: id });
    if (!exists) ctx.addIssue({ code: 'custom', message: `${modelName} не найден` });
};

const updateAgentUserSchema = z.object({
    params: z.object({
        id: objectId
    }),
    body: z.object({
        role: objectId.pipe(z.string().superRefine(dbExists('AgentRole'))).optional(),
        status: z.enum(['active', 'blocked'], "Недопустимый статус. Доступны: active, blocked").optional()
    })
}).superRefine(async (data, ctx) => {
    if (!mongoose.Types.ObjectId.isValid(data.params.id)) return;

    const agentUser = await mongoose.model('AgentUser').findById(data.params.id);

    if (!agentUser) {
        ctx.addIssue({ code: 'custom', path: ['params', 'id'], message: 'Пользователь не найден' });
        return;
    }

    if (data.body.role !== undefined && data.body.role === '') {
        ctx.addIssue({
            code: 'custom',
            path: ['body', 'role'],
            message: 'role не может быть пустой строкой'
        });
    }

    if (data.body.status !== undefined && data.body.status === '') {
        ctx.addIssue({
            code: 'custom',
            path: ['body', 'status'],
            message: 'status не может быть пустой строкой'
        });
    }

    if (data.body.role === undefined && data.body.status === undefined) {
        ctx.addIssue({
            code: 'custom',
            path: ['body'],
            message: 'Необходимо указать хотя бы одно поле для обновления: role или status'
        });
    }
});

const getAllAgentUsersSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/, "Номер страницы должен быть числом").transform(Number).default("1"),
        limit: z.string().regex(/^\d+$/, "Лимит должен быть числом").transform(Number).default("10"),
        search: z.string().optional(),
        role: objectId.optional(),
        status: z.enum(['active', 'blocked', 'pending'], "Недопустимый статус. Доступны: active, blocked, pending").optional(),
        hasPhone: z.enum(['true', 'false'], "Должно быть true или false").transform(val => val === 'true').optional()
    })
});

const getOneAgentUserSchema = z.object({
    params: z.object({
        id: objectId.pipe(z.string().superRefine(dbExists('AgentUser')))
    })
});

const deleteAgentUserSchema = z.object({
    params: z.object({
        id: objectId.pipe(z.string().superRefine(async (id, ctx) => {
            const agentUser = await mongoose.model('AgentUser').findById(id);
            
            if (!agentUser) {
                ctx.addIssue({ 
                    code: 'custom', 
                    path: ['params', 'id'], 
                    message: 'Пользователь не найден' 
                });
                return;
            }
        }))
    })
});

module.exports = {
    updateAgentUserSchema,
    getAllAgentUsersSchema,
    getOneAgentUserSchema,
    deleteAgentUserSchema
};