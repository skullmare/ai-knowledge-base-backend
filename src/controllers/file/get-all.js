const KnowledgeFile = require('../../models/knowledge-file');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    try {
        const { search, source, status, role, page = 1, limit = 10 } = req.validatedData.query;

        const filter = {};
        if (search) filter.name = { $regex: search, $options: 'i' };
        if (source) filter.source = source;
        if (status) filter.status = status;
        if (role) filter.accessibleByRoles = role;

        const skip = (Number(page) - 1) * Number(limit);

        const [files, total] = await Promise.all([
            KnowledgeFile.find(filter)
                .populate('accessibleByRoles', 'name')
                .populate('createdBy', 'firstName lastName photoUrl')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            KnowledgeFile.countDocuments(filter),
        ]);

        return successHandler(res, 200, 'Список файлов получен', { files }, {
            current: Number(page),
            limit: Number(limit),
            total,
        });
    } catch (error) {
        return errorHandler(res, 500, 'Ошибка сервера при получении списка файлов', [
            { path: 'server', message: error.message },
        ]);
    }
};
