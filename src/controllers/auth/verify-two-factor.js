const bcrypt = require('bcryptjs');
const authService = require('../../services/auth');
const PlatformUser = require('../../models/platform-user');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');
const logger = require('../../utils/logger');

const TWO_FACTOR_CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;

module.exports = async (req, res) => {
    try {
        const { login: userLogin, code } = req.body;
        const user = await PlatformUser.findOne({ login: userLogin }).select(
            '+twoFactorCode +twoFactorCodeSentAt +twoFactorAttempts'
        );

        if (!user) {
            return errorHandler(res, 401, 'Ошибка авторизации', [
                { path: 'login', message: 'Пользователь не найден' }
            ]);
        }

        if (!user.twoFactorCode || !user.twoFactorCodeSentAt) {
            return errorHandler(res, 400, 'Код подтверждения не был запрошен. Выполните вход заново.');
        }

        const now = new Date();
        const sentAt = new Date(user.twoFactorCodeSentAt);
        const codeExpired = now > new Date(sentAt.getTime() + TWO_FACTOR_CODE_TTL_MS);

        if (codeExpired) {
            await logHandler({
                action: ACTIONS_CONFIG.AUTH.actions.TWO_FACTOR_EXPIRED.key,
                message: `Истёкший код 2FA для пользователя ${userLogin}`,
                userId: user._id,
                status: 'error'
            });
            return errorHandler(res, 401, 'Срок действия кода истёк. Выполните вход заново.');
        }

        if (user.twoFactorAttempts >= MAX_ATTEMPTS) {
            return errorHandler(res, 429, 'Превышено количество попыток. Выполните вход заново.');
        }

        const isValid = await bcrypt.compare(code, user.twoFactorCode);

        if (!isValid) {
            const newAttempts = user.twoFactorAttempts + 1;
            await PlatformUser.findByIdAndUpdate(user._id, { twoFactorAttempts: newAttempts });

            await logHandler({
                action: ACTIONS_CONFIG.AUTH.actions.TWO_FACTOR_FAILED.key,
                message: `Неверный код 2FA для пользователя ${userLogin} (попытка ${newAttempts}/${MAX_ATTEMPTS})`,
                userId: user._id,
                status: 'error'
            });

            const remaining = MAX_ATTEMPTS - newAttempts;
            if (remaining <= 0) {
                return errorHandler(res, 401, 'Неверный код. Превышено количество попыток. Выполните вход заново.');
            }

            return errorHandler(res, 401, `Неверный код подтверждения. Осталось попыток: ${remaining}.`);
        }

        await PlatformUser.findByIdAndUpdate(user._id, {
            twoFactorCode: null,
            twoFactorCodeSentAt: null,
            twoFactorAttempts: 0,
            lastLogin: now
        });

        const payload = { id: user._id, role: user.role };
        const { accessToken, refreshToken } = authService.generateTokens(payload);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
            domain: '.amvera.io',
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

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
            { path: 'server', message: error.message }
        ]);
    }
};
