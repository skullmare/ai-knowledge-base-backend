const mongoose = require('mongoose');
const { z } = require('zod');
const { objectId: objectIdSchema, dbExists, paginationQuery } = require('./common');

const objectId = objectIdSchema();

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
        ...paginationQuery(10),
        search: z.string().trim().optional(),
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