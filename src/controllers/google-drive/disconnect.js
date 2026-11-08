const { disconnect, getAuthType, AUTH_TYPES } = require('../../services/google/client');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

module.exports = async (req, res) => {
    const userId = req.user?.id;

    try {
        if (await getAuthType() !== AUTH_TYPES.OAUTH) {
            return errorHandler(res, 409, 'Google Drive работает через сервисный аккаунт', [{
                path: 'google_drive_auth_type',
                message: 'Отключение не требуется: доступ определяется ключом сервисного аккаунта.',
            }]);
        }

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
