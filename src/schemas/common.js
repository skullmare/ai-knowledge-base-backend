const mongoose = require('mongoose');
const { z } = require('zod');

const objectId = (message = 'Некорректный ID') =>
    z.string().trim().refine(v => mongoose.Types.ObjectId.isValid(v), message);

const dbExists = (modelName, message) => async (id, ctx) => {
    const exists = await mongoose.model(modelName).exists({ _id: id });
    if (!exists) ctx.addIssue({ code: 'custom', message: message || `${modelName} не найден` });
};

const dbAllExist = (modelName, message) => async (ids, ctx) => {
    const uniqueIds = [...new Set(ids)];
    const count = await mongoose.model(modelName).countDocuments({ _id: { $in: uniqueIds } });
    if (count !== uniqueIds.length) {
        ctx.addIssue({ code: 'custom', message: message || `Одна или несколько записей в ${modelName} не найдены` });
    }
};

// В zod v4 .default() отдаёт значение в обход pipeline, поэтому дефолт
// задаётся уже числом — иначе в ответе оказывался page: "1" вместо 1.
const numericQuery = (defaultValue, label) =>
    z.string().regex(/^\d+$/, `${label} должен быть числом`)
        .transform(Number)
        .refine(v => v >= 1, `${label} должен быть больше нуля`)
        .default(defaultValue);

const paginationQuery = (defaultLimit = 10) => ({
    page: numericQuery(1, 'Номер страницы'),
    limit: numericQuery(defaultLimit, 'Лимит').refine(v => v <= 100, 'Лимит не может быть больше 100')
});

module.exports = { objectId, dbExists, dbAllExist, numericQuery, paginationQuery };
