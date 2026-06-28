const AgentUser = require('../../models/agent-user');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const currentPlatformUserId = req.user?.id;
    const { page, limit, search, role, status, hasPhone } = req.validatedData.query;

    try {
        const filter = {};

        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        if (role) {
            filter.role = role;
        }

        if (status) {
            filter.status = status;
        }

        if (hasPhone !== undefined) {
            if (hasPhone) {
                filter.phone = { $exists: true, $ne: null, $nin: [''] };
            } else {
                filter.phone = { $exists: false, $eq: null };
            }
        }

        const current = page;
        const skip = (current - 1) * limit;

        const [agentUsers, total] = await Promise.all([
            AgentUser.find(filter)
                .populate('role', 'name')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            AgentUser.countDocuments(filter)
        ]);

        const pagination = {
            total,
            current,
            limit,
            pages: Math.ceil(total / limit)
        };

        return successHandler(res, 200, 'Список пользователей агента успешно получен', agentUsers, pagination);

    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.AGENT_USERS.actions.SERVER_ERROR.key,
            message: `Ошибка при получении списка пользователей агента: ${error.message}`,
            userId: currentPlatformUserId,
            status: 'error'
        });

        return errorHandler(
            res,
            500,
            'Ошибка сервера при получении списка пользователей агента',
            [{ path: 'server', message: error.message }]
        );
    }
};
