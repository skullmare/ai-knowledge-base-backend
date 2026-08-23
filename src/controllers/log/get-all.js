const Log = require('../../models/log');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const { ACTION_LABEL_MAP, ACTION_GROUP_LABEL_MAP } = require('../../constants/actions');
const { searchRegex, buildPagination } = require('../../utils/query-helpers');

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

        if (search) filter.message = searchRegex(search);

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            Log.find(filter)
                .populate('user', 'photoUrl firstName lastName')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Log.countDocuments(filter)
        ]);

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
            buildPagination(total, page, limit)
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