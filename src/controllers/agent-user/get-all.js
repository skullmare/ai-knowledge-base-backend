const AgentUser = require('../../models/agent-user');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');
const { searchRegex, buildPagination } = require('../../utils/query-helpers');

module.exports = async (req, res) => {
    const currentPlatformUserId = req.user?.id;
    const { page, limit, search, role, status, hasPhone } = req.validatedData.query;

    try {
        const filter = {};

        if (search) {
            const pattern = searchRegex(search);
            filter.$or = [{ firstName: pattern }, { lastName: pattern }, { phone: pattern }];
        }

        if (role) {
            filter.role = role;
        }

        if (status) {
            filter.status = status;
        }

        // { $exists: false, $eq: null } не находит ничего: условия противоречат друг другу.
        if (hasPhone !== undefined) {
            filter.phone = hasPhone
                ? { $nin: [null, ''] }
                : { $in: [null, ''] };
        }

        const [agentUsers, total] = await Promise.all([
            AgentUser.find(filter)
                .populate('role', 'name')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            AgentUser.countDocuments(filter)
        ]);

        return successHandler(
            res,
            200,
            'Список пользователей агента успешно получен',
            agentUsers,
            buildPagination(total, page, limit)
        );

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
