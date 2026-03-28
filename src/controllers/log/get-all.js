const Log = require('../../models/log');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    const { 
        page, 
        limit, 
        search, 
        action, 
        entityType, 
        entityId, 
        user, 
        status, 
        startDate, 
        endDate 
    } = req.validatedData.query;

    try {
        const filter = {};

        if (action) filter.action = action;
        if (entityType) filter.entityType = entityType;
        if (entityId) filter.entityId = entityId;
        if (user) filter.user = user;
        if (status) filter.status = status;

        if (search) {
            filter.message = new RegExp(search, 'i');
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            Log.find(filter)
                .populate('user', 'login firstName lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Log.countDocuments(filter)
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
            'Логи успешно получены',
            logs,
            pagination
        );

    } catch (error) {
        return errorHandler(
            res,
            500,
            'Ошибка сервера при получении логов',
            [{ path: 'server', message: error.message }]
        );
    }
};