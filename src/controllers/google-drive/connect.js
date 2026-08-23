const { exchangeCode } = require('../../services/google/client');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

/** Завершает OAuth-подключение: меняет код авторизации на refresh token. */
module.exports = async (req, res) => {
    const userId = req.user?.id;

    try {
        const { code } = req.validatedData.body;
        const { email } = await exchangeCode(code);

        await logHandler({
            action: ACTIONS_CONFIG.GOOGLE_DRIVE.actions.CONNECT.key,
            message: `Google Drive подключён${email ? ` (${email})` : ''}`,
            userId,
            status: 'success',
        });

        return successHandler(res, 200, 'Google Drive подключён', { email, isConnected: true });
    } catch (error) {
        await logHandler({
            action: ACTIONS_CONFIG.GOOGLE_DRIVE.actions.SERVER_ERROR.key,
            message: `Ошибка подключения Google Drive: ${error.message}`,
            userId,
            status: 'error',
        });

        return errorHandler(res, 400, 'Не удалось подключить Google Drive', [
            { path: 'code', message: error.message },
        ]);
    }
};
