// Пользовательский ввод нельзя передавать в RegExp напрямую:
// спецсимволы ломают поиск и открывают ReDoS.
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const searchRegex = (value) => new RegExp(escapeRegex(value), 'i');

const buildPagination = (total, page, limit) => ({
    total,
    current: page,
    limit,
    pages: limit > 0 ? Math.ceil(total / limit) : 0
});

module.exports = { escapeRegex, searchRegex, buildPagination };
