const { z } = require('zod');
const mongoose = require('mongoose');

const objectId = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), "Некорректный ID");

const getLogsSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/, "Номер страницы должен быть числом").transform(Number).default("1"),
        limit: z.string().regex(/^\d+$/, "Лимит должен быть числом").transform(Number).default("20"),
        action: z.string().optional(),
        entityType: z.string().optional(),
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