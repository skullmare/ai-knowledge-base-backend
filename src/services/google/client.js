const { google } = require('googleapis');
const { getSetting, updateSettings } = require('../settings');

const SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
];

const readCredentials = async () => {
    const [clientId, clientSecret, redirectUri] = await Promise.all([
        getSetting('google_drive_client_id'),
        getSetting('google_drive_client_secret'),
        getSetting('google_drive_redirect_uri'),
    ]);

    return { clientId, clientSecret, redirectUri };
};

/** OAuth2-клиент без токенов — для генерации ссылки и обмена кода. */
async function getOAuthClient() {
    const { clientId, clientSecret, redirectUri } = await readCredentials();

    if (!clientId || !clientSecret) {
        throw new Error('Google Drive не настроен: укажите Client ID и Client Secret в настройках системы.');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri || undefined);
}

/** OAuth2-клиент с сохранённым refresh token — для запросов к Drive. */
async function getAuthorizedClient() {
    const client = await getOAuthClient();
    const refreshToken = await getSetting('google_drive_refresh_token');

    if (!refreshToken) {
        throw new Error('Google Drive не подключён. Подключите аккаунт в настройках системы.');
    }

    client.setCredentials({ refresh_token: refreshToken });
    return client;
}

async function getDriveClient() {
    const auth = await getAuthorizedClient();
    return google.drive({ version: 'v3', auth });
}

function buildAuthUrl(client, state) {
    return client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: SCOPES,
        state,
    });
}

/**
 * Обменивает код авторизации на токены и сохраняет refresh token в настройках.
 */
async function exchangeCode(code) {
    const client = await getOAuthClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
        throw new Error(
            'Google не вернул refresh token. Отзовите доступ приложения в аккаунте Google и подключите диск заново.'
        );
    }

    client.setCredentials(tokens);

    let email = '';
    try {
        const oauth2 = google.oauth2({ version: 'v2', auth: client });
        const { data } = await oauth2.userinfo.get();
        email = data.email ?? '';
    } catch {
        // email не критичен — подключение считаем состоявшимся
    }

    await updateSettings({
        google_drive_refresh_token: tokens.refresh_token,
        google_drive_account_email: email,
    });

    return { email };
}

async function disconnect() {
    await updateSettings({
        google_drive_refresh_token: '',
        google_drive_account_email: '',
    });
}

async function getConnectionStatus() {
    const { clientId, clientSecret, redirectUri } = await readCredentials();
    const [refreshToken, email] = await Promise.all([
        getSetting('google_drive_refresh_token'),
        getSetting('google_drive_account_email'),
    ]);

    return {
        isConfigured: Boolean(clientId && clientSecret),
        isConnected: Boolean(refreshToken),
        email: email || null,
        redirectUri: redirectUri || null,
    };
}

module.exports = {
    SCOPES,
    getOAuthClient,
    getAuthorizedClient,
    getDriveClient,
    buildAuthUrl,
    exchangeCode,
    disconnect,
    getConnectionStatus,
};
