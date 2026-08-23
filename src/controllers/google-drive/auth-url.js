const { getOAuthClient, buildAuthUrl } = require('../../services/google/client');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

/** Ссылка на экран согласия Google — открывается в интерфейсе настроек. */
module.exports = async (req, res) => {
    try {
        const client = await getOAuthClient();
        const url = buildAuthUrl(client, req.user?.id);

        return successHandler(res, 200, 'Ссылка авторизации сформирована', { url });
    } catch (error) {
        return errorHandler(res, 400, 'Не удалось сформировать ссылку авторизации', [
            { path: 'google_drive_client_id', message: error.message },
        ]);
    }
};
