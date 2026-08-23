const { z } = require('zod');
const { objectId: objectIdSchema, paginationQuery } = require('./common');
const { ALL_ACTIONS, ALL_CATEGORY } = require('../constants/actions');

const objectId = objectIdSchema();

const getLogsSchema = z.object({
    query: z.object({
        ...paginationQuery(20),
        action: z.enum(ALL_ACTIONS, "Неизвестное событие").optional(),
        category: z.enum(ALL_CATEGORY, "Неизвестная категория события").optional(),
        entityId: objectId.optional(),
        user: objectId.optional(),
        status: z.enum(['success', 'error']).optional(),
        search: z.string().optional(),
        startDate: z.iso.datetime({ message: "Некорректный формат даты начала" }).optional(),
        endDate: z.iso.datetime({ message: "Некорректный формат даты конца" }).optional()
    })
});

const getLogSchema = z.object({
    params: z.object({
        id: objectId
    })
});

module.exports = { getLogsSchema, getLogSchema };