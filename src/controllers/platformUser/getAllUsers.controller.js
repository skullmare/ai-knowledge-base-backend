const User = require('../../models/platformUser');

const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');

module.exports = async (req, res) => {
    const { page, limit, search, role, status } = req.validatedData.query;

    try {
        const filter = {};

        if (status) filter.status = status;
        if (role) filter.role = role;

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            filter.$or = [
                { login: searchRegex },
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex }
            ];
        }

        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find(filter)
                .populate('role', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(filter)
        ]);

        const pagination = {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        };

        return successHandler(
            res,
            200,
            'Список сотрудников успешно получен',
            users,
            pagination
        );

    } catch (error) {
        return errorHandler(
            res,
            500,
            'Ошибка сервера при получении списка пользователей',
            [{ path: 'server', message: error.message }]
        );
    }
};