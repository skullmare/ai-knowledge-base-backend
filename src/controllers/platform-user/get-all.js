const PlatformUser = require('../../models/platform-user');
const { searchRegex, buildPagination } = require('../../utils/query-helpers');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    const { page, limit, search, role, status } = req.validatedData.query;

    try {
        const filter = {};
        if (status) filter.status = status;
        if (role) filter.role = role;

        if (search) {
            const pattern = searchRegex(search);
            filter.$or = [
                { login: pattern },
                { firstName: pattern },
                { lastName: pattern },
                { email: pattern }
            ];
        }

        const [users, total] = await Promise.all([
            PlatformUser.find(filter)
                .populate('role', 'name')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            PlatformUser.countDocuments(filter)
        ]);

        return successHandler(res, 200, 'Список сотрудников успешно получен', users, buildPagination(total, page, limit));

    } catch (error) {
        return errorHandler(res, 500, 'Ошибка сервера при получении списка пользователей', [
            { path: 'server', message: error.message }
        ]);
    }
};
