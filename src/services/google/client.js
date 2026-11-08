const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { getSetting, updateSettings } = require('../settings');
const logger = require('../../utils/logger');

const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

// Scope userinfo нужен только OAuth-режиму: по нему мы узнаём email подключённого
// аккаунта. Сервисному аккаунту он не требуется.
const OAUTH_SCOPES = [
    ...DRIVE_SCOPES,
    'https://www.googleapis.com/auth/userinfo.email',
];

const AUTH_TYPES = {
    SERVICE_ACCOUNT: 'service_account',
    OAUTH: 'oauth',
};

const ACCESS_CHECK_TTL_MS = 60_000;
const ROOT_META_TTL_MS = 5 * 60_000;
const PROBE_TTL_MS = 60_000;
const PROBE_TIMEOUT_MS = 8_000;

// --- распознавание причин отказа Google ------------------------------------

const REVOKED_MARKERS = ['invalid_grant', 'expired or revoked', 'token has been expired'];
const CLIENT_MARKERS = ['invalid_client', 'unauthorized_client'];

/** Тело ошибки Google лежит в разных местах у gaxios и googleapis — собираем все. */
function googleErrorPayload(error) {
    const candidates = [
        error?.response?.data,
        error?.cause?.response?.data,
        error?.error?.response?.data,
    ];

    return candidates.find((item) => item && typeof item === 'object') ?? null;
}

function googleErrorText(error) {
    const payload = googleErrorPayload(error);
    const parts = [payload?.error, payload?.error_description, error?.message];

    return parts.filter((part) => typeof part === 'string').join(' ');
}

/**
 * Классифицирует отказ авторизации.
 *
 * 'token_revoked'   — refresh token/ключ больше не действует, нужен новый доступ;
 * 'client_rejected' — Google не принял сам OAuth-клиент (ID/Secret).
 * @returns {'token_revoked'|'client_rejected'|null}
 */
function classifyAuthError(error) {
    const text = googleErrorText(error).toLowerCase();
    if (!text) return null;

    if (REVOKED_MARKERS.some((marker) => text.includes(marker))) return 'token_revoked';
    if (CLIENT_MARKERS.some((marker) => text.includes(marker))) return 'client_rejected';

    return null;
}

const RECONNECT_HINT =
    'Доступ к Google Диску недействителен или отозван. Проверьте ключ сервисного аккаунта или переподключите аккаунт в настройках системы.';

/** Переводит отказ Google в понятный текст для интерфейса и логов. */
function describeGoogleError(error, context = 'Запрос к Google Drive') {
    const kind = classifyAuthError(error);

    if (kind === 'token_revoked') {
        return `${context}: ${RECONNECT_HINT}`;
    }

    if (kind === 'client_rejected') {
        return `${context}: Google отклонил OAuth-клиент. Проверьте Client ID и Client Secret в настройках системы. ${googleErrorText(error)}`.trim();
    }

    return `${context}: ${error?.message ?? error}`;
}

/** Ошибка «токен/ключ больше не действует» — повод показать «переподключите Drive». */
function isReauthError(error) {
    return classifyAuthError(error) !== null;
}

const readCredentials = async () => {
    const [clientId, clientSecret, redirectUri] = await Promise.all([
        getSetting('google_drive_client_id'),
        getSetting('google_drive_client_secret'),
        getSetting('google_drive_redirect_uri'),
    ]);

    return { clientId, clientSecret, redirectUri };
};

/**
 * Способ авторизации. По умолчанию — сервисный аккаунт: его ключ не истекает,
 * в отличие от refresh token OAuth-приложения в режиме Testing.
 */
async function getAuthType() {
    const value = await getSetting('google_drive_auth_type');
    return value === AUTH_TYPES.OAUTH ? AUTH_TYPES.OAUTH : AUTH_TYPES.SERVICE_ACCOUNT;
}

/** OAuth2-клиент без токенов — для генерации ссылки и обмена кода. */
async function getOAuthClient() {
    const { clientId, clientSecret, redirectUri } = await readCredentials();

    if (!clientId || !clientSecret) {
        throw new Error('Google Drive не настроен: укажите Client ID и Client Secret в настройках системы.');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri || undefined);
}

let oauthClientCache = null;

/**
 * OAuth2-клиент с сохранённым refresh token — для запросов к Drive.
 * Клиент кэшируется, чтобы не обменивать refresh token на access token
 * при каждом обращении к API.
 */
async function getAuthorizedClient() {
    const { clientId, clientSecret, redirectUri } = await readCredentials();
    const refreshToken = await getSetting('google_drive_refresh_token');

    if (!refreshToken) {
        throw new Error('Google Drive не подключён. Подключите аккаунт в настройках системы.');
    }

    const cacheKey = [clientId, clientSecret, redirectUri, refreshToken].join('\u0000');
    if (oauthClientCache?.key === cacheKey) return oauthClientCache.client;

    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri || undefined);
    client.setCredentials({ refresh_token: refreshToken });

    // Google может вернуть новый refresh token при обновлении — сохраняем его,
    // чтобы не потерять доступ после ротации.
    client.on('tokens', (tokens) => {
        if (!tokens.refresh_token || tokens.refresh_token === refreshToken) return;

        updateSettings({ google_drive_refresh_token: tokens.refresh_token })
            .then(() => {
                oauthClientCache = null;
                invalidateProbeCache();
            })
            .catch((error) => {
                logger.error('Не удалось сохранить обновлённый refresh token Google Drive', null, error.message);
            });
    });

    oauthClientCache = { key: cacheKey, client };
    return client;
}

const serviceAccountCache = {
    fingerprint: null,
    credentials: null,
    auth: null,
};

const resolveKeyFile = (keyFile) =>
    path.isAbsolute(keyFile) ? keyFile : path.resolve(process.cwd(), keyFile);

/**
 * Читает JSON-ключ сервисного аккаунта. Ключ перечитывается только при
 * изменении файла — так access token остаётся в кэше между запросами.
 */
async function readServiceAccountCredentials() {
    const keyFile = await getSetting('google_drive_service_account_key_file');

    if (!keyFile) {
        throw new Error(
            'Google Drive не настроен: укажите путь к JSON-ключу сервисного аккаунта в настройках системы.'
        );
    }

    const resolved = resolveKeyFile(keyFile);

    let stat;
    try {
        stat = await fs.promises.stat(resolved);
    } catch {
        throw new Error(`Файл ключа сервисного аккаунта не найден: ${resolved}`);
    }

    const fingerprint = `${resolved}:${stat.mtimeMs}:${stat.size}`;
    if (serviceAccountCache.fingerprint === fingerprint && serviceAccountCache.credentials) {
        return serviceAccountCache.credentials;
    }

    let credentials;
    try {
        credentials = JSON.parse(await fs.promises.readFile(resolved, 'utf8'));
    } catch (error) {
        throw new Error(`Не удалось прочитать ключ сервисного аккаунта: ${error.message}`, { cause: error });
    }

    if (credentials.type !== 'service_account' || !credentials.client_email || !credentials.private_key) {
        throw new Error(
            'Файл не похож на JSON-ключ сервисного аккаунта Google: нет полей type, client_email или private_key.'
        );
    }

    serviceAccountCache.fingerprint = fingerprint;
    serviceAccountCache.credentials = credentials;
    serviceAccountCache.auth = null;

    return credentials;
}

/** Авторизация сервисного аккаунта (JWT). Ключ не истекает. */
async function getServiceAccountAuth() {
    const credentials = await readServiceAccountCredentials();

    if (serviceAccountCache.auth) return serviceAccountCache.auth;

    serviceAccountCache.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: DRIVE_SCOPES,
    });

    return serviceAccountCache.auth;
}

async function getDriveClient() {
    const authType = await getAuthType();
    const auth = authType === AUTH_TYPES.OAUTH
        ? await getAuthorizedClient()
        : await getServiceAccountAuth();

    return google.drive({ version: 'v3', auth });
}

/** Корень листинга: папка, расшаренная сервисному аккаунту. */
async function getRootFolderId() {
    const configured = await getSetting('google_drive_root_folder_id');
    return configured || 'root';
}

let rootMetaCache = { key: null, meta: null, at: 0 };
let rootMetaPromise = null;

/** Имя и driveId корневой папки. Кэш — чтобы не делать лишний запрос на каждый листинг. */
async function getRootFolderMeta() {
    const rootId = await getRootFolderId();

    if (rootId === 'root') {
        return { id: 'root', name: 'Мой диск', driveId: null };
    }

    if (rootMetaCache.key === rootId && Date.now() - rootMetaCache.at < ROOT_META_TTL_MS) {
        return rootMetaCache.meta;
    }

    // Листинг и хлебные крошки запрашиваются параллельно — не дублируем запрос
    if (rootMetaPromise) return rootMetaPromise;

    rootMetaPromise = (async () => {
        const drive = await getDriveClient();
        const { data } = await drive.files.get({
            fileId: rootId,
            fields: 'id, name, driveId',
            supportsAllDrives: true,
        });

        const meta = {
            id: data.id,
            name: data.name,
            driveId: data.driveId ?? null,
        };

        rootMetaCache = { key: rootId, meta, at: Date.now() };
        return meta;
    })().finally(() => {
        rootMetaPromise = null;
    });

    return rootMetaPromise;
}

// --- проверка сохранённого доступа -----------------------------------------

let probeCache = null;
let accessCheckCache = { key: null, at: 0, result: null };

/** Сбрасывает закэшированные результаты проверок после отказа авторизации. */
function invalidateProbeCache() {
    probeCache = null;
    accessCheckCache = { key: null, at: 0, result: null };
    oauthClientCache = null;
    serviceAccountCache.auth = null;
}

const withTimeout = (promise, ms) => {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Таймаут проверки токена Google')), ms);
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

/**
 * Реально проверяет refresh token у Google (только OAuth-режим).
 *
 * Статус нельзя вычислять как «в базе есть непустая строка»: мёртвый токен
 * тогда показывается как рабочий. Здесь мы обмениваем refresh token на access
 * token — именно та операция, которая падает при отзыве доступа.
 *
 * @returns {Promise<{state: 'ok'|'missing'|'invalid'|'unknown', kind?: string, detail?: string}>}
 */
async function probeRefreshToken({ force = false } = {}) {
    if (!force && probeCache && Date.now() - probeCache.at < PROBE_TTL_MS) {
        return probeCache.value;
    }

    let value;

    try {
        const client = await getOAuthClient();
        const refreshToken = await getSetting('google_drive_refresh_token');

        if (!refreshToken) {
            value = { state: 'missing' };
        } else {
            client.setCredentials({ refresh_token: refreshToken });
            await withTimeout(client.refreshAccessToken(), PROBE_TIMEOUT_MS);
            value = { state: 'ok' };
        }
    } catch (error) {
        const kind = classifyAuthError(error);

        value = kind
            ? { state: 'invalid', kind, detail: googleErrorText(error) }
            : { state: 'unknown', detail: error?.message ?? String(error) };
    }

    probeCache = { at: Date.now(), value };
    return value;
}

/** Проверяет, что ключ и доступ к корневой папке рабочие (service account). */
async function checkRootAccess(rootFolderId) {
    if (accessCheckCache.key === rootFolderId && Date.now() - accessCheckCache.at < ACCESS_CHECK_TTL_MS) {
        return accessCheckCache.result;
    }

    let result;
    try {
        const drive = await getDriveClient();
        await drive.files.get({
            fileId: rootFolderId,
            fields: 'id, name',
            supportsAllDrives: true,
        });
        result = { ok: true, error: null };
    } catch (error) {
        result = { ok: false, error: error.message };
    }

    accessCheckCache = { key: rootFolderId, at: Date.now(), result };
    return result;
}

function buildAuthUrl(client, state) {
    return client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: OAUTH_SCOPES,
        state,
    });
}

/**
 * Обменивает код авторизации на токены и сохраняет refresh token в настройках.
 */
async function exchangeCode(code) {
    const client = await getOAuthClient();

    let tokens;
    try {
        ({ tokens } = await client.getToken(code));
    } catch (error) {
        if (classifyAuthError(error) === 'token_revoked') {
            throw new Error(
                'Google отклонил код авторизации: доступ приложения отозван. Отзовите доступ в аккаунте Google и подключите диск заново.',
                { cause: error }
            );
        }

        throw new Error(describeGoogleError(error, 'Обмен кода авторизации'), { cause: error });
    }

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

    // Новый токен — прежний результат проверки больше не актуален
    invalidateProbeCache();

    return { email };
}

async function disconnect() {
    await updateSettings({
        google_drive_refresh_token: '',
        google_drive_account_email: '',
    });

    invalidateProbeCache();
}

/**
 * Состояние интеграции для интерфейса.
 *
 * isConnected отвечает на вопрос «работает ли доступ прямо сейчас», а не
 * «есть ли в базе строка токена». Для OAuth-режима это проверка обменом
 * refresh token, для service account — чтение ключа и доступ к корневой папке.
 */
async function getConnectionStatus() {
    const authType = await getAuthType();
    const rootFolderId = await getSetting('google_drive_root_folder_id');

    if (authType === AUTH_TYPES.OAUTH) {
        const { clientId, clientSecret, redirectUri } = await readCredentials();
        const [refreshToken, email] = await Promise.all([
            getSetting('google_drive_refresh_token'),
            getSetting('google_drive_account_email'),
        ]);

        const base = {
            authType,
            isConfigured: Boolean(clientId && clientSecret),
            redirectUri: redirectUri || null,
            email: email || null,
            hasToken: Boolean(refreshToken),
            rootFolderId: null,
        };

        if (!base.isConfigured) {
            return { ...base, isConnected: false, needsReconnect: false };
        }

        if (!refreshToken) {
            return { ...base, isConnected: false, needsReconnect: false };
        }

        const probe = await probeRefreshToken();

        if (probe.state === 'ok') {
            return { ...base, isConnected: true, needsReconnect: false };
        }

        if (probe.state === 'invalid' && probe.kind === 'token_revoked') {
            return {
                ...base,
                isConnected: false,
                needsReconnect: true,
                reason: RECONNECT_HINT,
            };
        }

        if (probe.state === 'invalid' && probe.kind === 'client_rejected') {
            return {
                ...base,
                isConnected: false,
                needsReconnect: false,
                reason: 'Google отклонил OAuth-клиент. Проверьте Client ID и Client Secret.',
            };
        }

        // Сеть, таймаут или иная неясная причина: доступ мог и не пропасть.
        // Оптимистично считаем подключённым, чтобы не гонять пользователя
        // по кругу переподключения из-за сетевого сбоя.
        return {
            ...base,
            isConnected: true,
            needsReconnect: false,
            probeWarning: `Не удалось проверить токен Google: ${probe.detail ?? 'неизвестная ошибка'}`,
        };
    }

    let credentials = null;
    let error = null;

    try {
        credentials = await readServiceAccountCredentials();
    } catch (readError) {
        error = readError.message;
    }

    const base = {
        authType,
        isConfigured: Boolean(credentials),
        redirectUri: null,
        email: credentials?.client_email ?? null,
        hasToken: false,
        rootFolderId: rootFolderId || null,
    };

    if (!credentials) {
        return { ...base, isConnected: false, needsReconnect: false, reason: error };
    }

    if (!rootFolderId) {
        return {
            ...base,
            isConnected: false,
            needsReconnect: false,
            reason: 'Не задан ID корневой папки Google Drive.',
        };
    }

    const check = await checkRootAccess(rootFolderId);

    if (check.ok) {
        return { ...base, isConnected: true, needsReconnect: false };
    }

    return {
        ...base,
        isConnected: false,
        needsReconnect: false,
        reason: `Нет доступа к корневой папке Google Drive: ${check.error}`,
    };
}

module.exports = {
    AUTH_TYPES,
    SCOPES: OAUTH_SCOPES,
    DRIVE_SCOPES,
    getAuthType,
    getOAuthClient,
    getAuthorizedClient,
    getServiceAccountAuth,
    getDriveClient,
    getRootFolderId,
    getRootFolderMeta,
    buildAuthUrl,
    exchangeCode,
    disconnect,
    isReauthError,
    probeRefreshToken,
    invalidateProbeCache,
    classifyAuthError,
    describeGoogleError,
    getConnectionStatus,
};
