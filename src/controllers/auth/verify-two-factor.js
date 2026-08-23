const PlatformUser = require('../../models/platform-user');
const authService = require('../../services/auth');
const { comparePassword } = require('../../utils/password-handler');
const { setRefreshCookie } = require('../../utils/auth-cookie');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');
const logger = require('../../utils/logger');

const TWO_FACTOR_CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;

const clearCode = (userId, extra = {}) =>
    PlatformUser.findByIdAndUpdate(userId, {
        twoFactorCode: null,
        twoFactorCodeSentAt: null,
        twoFactorAttempts: 0,
        ...extra
    });

module.exports = async (req, res) => {
    const { login: userLogin, code } = req.validatedData.body;

    try {
        const user = await PlatformUser.findOne({ login: userLogin }).select(
            '+twoFactorCode +twoFactorCodeSentAt +twoFactorAttempts'
        );

        // Сообщение одинаковое для несуществующего логина и незапрошенного кода,
        // чтобы не подсказывать перебором существующие учётные записи.
        if (!user || !user.twoFactorCode || !user.twoFactorCodeSentAt) {
            return errorHandler(res, 401, 'Код подтверждения не запрашивался или истёк. Выполните вход заново.', [
                { path: 'code', message: 'Код недействителен' }
            ]);
        }

        if (user.status === 'blocked') {
            return errorHandler(res, 403, 'Доступ запрещён', [
                { path: 'login', message: 'Ваш аккаунт заблокирован' }
            ]);
        }

        const now = new Date();
        const expiresAt = new Date(new Date(user.twoFactorCodeSentAt).getTime() + TWO_FACTOR_CODE_TTL_MS);

        if (now > expiresAt) {
            await clearCode(user._id);
            await logHandler({
                action: ACTIONS_CONFIG.AUTH.actions.TWO_FACTOR_EXPIRED.key,
                message: `Истёкший код 2FA для пользователя ${userLogin}`,
                userId: user._id,
                status: 'error'
            });

            return errorHandler(res, 401, 'Срок действия кода истёк. Выполните вход заново.', [
                { path: 'code', message: 'Код просрочен' }
            ]);
        }

        if (user.twoFactorAttempts >= MAX_ATTEMPTS) {
            return errorHandler(res, 429, 'Превышено количество попыток. Выполните вход заново.', [
                { path: 'code', message: 'Слишком много неудачных попыток' }
            ]);
        }

        if (!(await comparePassword(code, user.twoFactorCode))) {
            const attempts = user.twoFactorAttempts + 1;
            await PlatformUser.findByIdAndUpdate(user._id, { twoFactorAttempts: attempts });

            await logHandler({
                action: ACTIONS_CONFIG.AUTH.actions.TWO_FACTOR_FAILED.key,
                message: `Неверный код 2FA для пользователя ${userLogin} (попытка ${attempts}/${MAX_ATTEMPTS})`,
                userId: user._id,
                status: 'error'
            });

            const remaining = MAX_ATTEMPTS - attempts;

            return errorHandler(
                res,
                401,
                remaining > 0
                    ? `Неверный код подтверждения. Осталось попыток: ${remaining}.`
                    : 'Неверный код. Превышено количество попыток. Выполните вход заново.',
                [{ path: 'code', message: 'Неверный код подтверждения' }]
            );
        }

        await clearCode(user._id, { lastLogin: now });

        const { accessToken, refreshToken } = authService.generateTokens({
            id: user._id,
            role: user.role
        });

        setRefreshCookie(res, refreshToken);

        await logHandler({
            action: ACTIONS_CONFIG.AUTH.actions.TWO_FACTOR_SUCCESS.key,
            message: `Пользователь ${userLogin} успешно прошёл двухфакторную аутентификацию`,
            userId: user._id,
            status: 'success'
        });

        return successHandler(res, 200, 'Вход выполнен успешно', { accessToken });

    } catch (error) {
        logger.error('Ошибка при проверке кода 2FA', null, error.message);

        await logHandler({
            action: ACTIONS_CONFIG.AUTH.actions.SERVER_ERROR.key,
            message: `Ошибка сервера при проверке кода 2FA: ${error.message}`,
            userId: null,
            status: 'error'
        });

        return errorHandler(res, 500, 'Ошибка сервера', [
            { path: 'server', message: 'Не удалось проверить код подтверждения' }
        ]);
    }
};
