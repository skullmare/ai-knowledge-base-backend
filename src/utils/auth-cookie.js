const { env } = require('../../config/env');

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// secure + sameSite=none нужны кросс-доменному фронтенду в проде,
// но по http на localhost такая кука браузером отбрасывается.
const cookieOptions = () => ({
    httpOnly: true,
    secure: !env.isDev,
    sameSite: env.isDev ? 'lax' : 'none',
    path: '/',
    domain: env.cookieDomain
});

const setRefreshCookie = (res, token) => {
    res.cookie(REFRESH_COOKIE, token, {
        ...cookieOptions(),
        expires: new Date(Date.now() + REFRESH_TTL_MS)
    });
};

const clearRefreshCookie = (res) => {
    res.clearCookie(REFRESH_COOKIE, cookieOptions());
};

module.exports = { REFRESH_COOKIE, REFRESH_TTL_MS, setRefreshCookie, clearRefreshCookie };
