const AgentRole = require('../../models/agent-role');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    const { page, limit, search } = req.validatedData.query;

    try {
        const filter = {};

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            filter.$or = [
                { name: searchRegex },
                { description: searchRegex }
            ];
        }

        const skip = (page - 1) * limit;

        const [roles, total] = await Promise.all([
            AgentRole.find(filter)
                .sort({ createdAt: -1 }) 
                .skip(skip)
                .limit(limit)
                .lean(),
            AgentRole.countDocuments(filter)
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
            'Список ролей агентов успешно получен',
            roles,
            pagination
        );

    } catch (error) {
        return errorHandler(
            res,
            500,
            'Ошибка сервера при получении списка ролей агентов',
            [{ path: 'server', message: error.message }]
        );
    }
};