const Log = require('../models/log');
const { ACTION_TO_ENTITY_MAP } = require('../constants/actions');

module.exports = async ({ action, message, userId, entityId, status = 'success' }) => {
    try {
        const entityType = ACTION_TO_ENTITY_MAP[action];

        await Log.create({
            action,
            message,
            user: userId,
            entityType,
            entityId,
            status
        });
    } catch (error) {
        console.error(`[LOG_ERROR]: ${action} | Msg: ${message} | Error: ${error.message}`);
    }
};