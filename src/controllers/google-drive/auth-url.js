const { getOAuthClient, buildAuthUrl, getAuthType, AUTH_TYPES } = require('../../services/google/client');
const { getSetting } = require('../../services/settings');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

/** Ссылка на экран согласия Google — открывается в интерфейсе настроек. */
module.exports = async (req, res) => {
    try {
        if (await getAuthType() !== AUTH_TYPES.OAUTH) {
            return errorHandler(res, 409, 'Google Drive работает через сервисный аккаунт', [{
                path: 'google_drive_auth_type',
                message: 'OAuth-подключение отключено. Доступ настраивается ключом сервисного аккаунта.',
            }]);
        }

        const redirectUri = await getSetting('google_drive_redirect_uri');

        // Без redirect_uri Google ответит 400 уже на своей стороне — сообщаем раньше
        if (!redirectUri) {
            return errorHandler(res, 400, 'Не задан Redirect URI', [{
                path: 'google_drive_redirect_uri',
                message: 'Укажите Redirect URI и добавьте его в «Authorized redirect URIs» OAuth-клиента Google',
            }]);
        }

        const client = await getOAuthClient();
        const url = buildAuthUrl(client, req.user?.id);

        // redirectUri отдаём наружу, чтобы интерфейс показал точное значение,
        // которое уходит в Google — его и нужно прописать в консоли
        return successHandler(res, 200, 'Ссылка авторизации сформирована', { url, redirectUri });
    } catch (error) {
        return errorHandler(res, 400, 'Не удалось сформировать ссылку авторизации', [
            { path: 'google_drive_client_id', message: error.message },
        ]);
    }
};
