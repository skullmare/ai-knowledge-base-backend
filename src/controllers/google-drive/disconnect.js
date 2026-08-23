const { disconnect } = require('../../services/google/client');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const userId = req.user?.id;

    try {
        await disconnect();

        await logHandler({
            action: ACTIONS_CONFIG.GOOGLE_DRIVE.actions.DISCONNECT.key,
            message: 'Google Drive отключён',
            userId,
            status: 'success',
        });

        return successHandler(res, 200, 'Google Drive отключён', { isConnected: false });
    } catch (error) {
        return errorHandler(res, 500, 'Не удалось отключить Google Drive', [
            { path: 'server', message: error.message },
        ]);
    }
};
