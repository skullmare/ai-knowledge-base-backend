const Log = require('../../models/log');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const { ACTION_LABEL_MAP, ACTION_GROUP_LABEL_MAP } = require('../../constants/actions');

module.exports = async (req, res) => {
    const { 
        page, 
        limit, 
        search, 
        action, 
        category, 
        entityId, 
        user, 
        status, 
        startDate, 
        endDate 
    } = req.validatedData.query;

    try {
        const filter = {};

        if (action) filter.action = action;
        if (category) filter.category = category;
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

        const current = page;
        const skip = (current - 1) * limit;

        const [logs, total] = await Promise.all([
            Log.find(filter)
                .populate('user', 'photoUrl firstName lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Log.countDocuments(filter)
        ]);

        const pagination = {
            total,
            current,
            limit,
            pages: Math.ceil(total / limit)
        };

        const localizedLogs = logs.map(log => ({
            ...log,
            actionLabel: ACTION_LABEL_MAP[log.action] ?? log.action,
            entityTypeLabel: ACTION_GROUP_LABEL_MAP[log.action] ?? log.entityType,
        }));

        return successHandler(
            res,
            200,
            'Логи успешно получены',
            localizedLogs,
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