const authService = require('../../services/auth');
const PlatformUser = require('../../models/platform-user');
const { setRefreshCookie, clearRefreshCookie } = require('../../utils/auth-cookie');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');

const rejectSession = async (res, message, errors) => {
    await logHandler({
        action: ACTIONS_CONFIG.AUTH.actions.REFRESH_INVALID.key,
        message,
        userId: null,
        status: 'error'
    });

    clearRefreshCookie(res);
    return errorHandler(res, 401, 'Сессия истекла', errors);
};

module.exports = async (req, res) => {
    const token = req.cookies?.refreshToken;

    if (!token) {
        return errorHandler(res, 401, 'Сессия истекла', [
            { path: 'refreshToken', message: 'Токен обновления не предоставлен' }
        ]);
    }

    const decoded = authService.validateRefreshToken(token);

    if (!decoded) {
        return rejectSession(res, 'Попытка обновления с невалидным или протухшим токеном', [
            { path: 'refreshToken', message: 'Невалидный или просроченный токен обновления' }
        ]);
    }

    // Токен может пережить блокировку или удаление аккаунта —
    // без этой проверки заблокированный пользователь продлевает сессию бесконечно.
    const user = await PlatformUser.findById(decoded.id).select('status role').lean();

    if (!user || user.status === 'blocked') {
        return rejectSession(res, `Обновление сессии для недоступного аккаунта ${decoded.id}`, [
            { path: 'refreshToken', message: 'Аккаунт заблокирован или удалён' }
        ]);
    }

    await PlatformUser.findByIdAndUpdate(decoded.id, { lastLogin: new Date() });

    const { accessToken, refreshToken } = authService.generateTokens({
        id: decoded.id,
        role: user.role
    });

    setRefreshCookie(res, refreshToken);

    return successHandler(res, 200, 'Токен успешно обновлен', { accessToken });
};
