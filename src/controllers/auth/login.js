const crypto = require('crypto');
const PlatformUser = require('../../models/platform-user');
const { hashPassword, comparePassword } = require('../../utils/password-handler');
const { sendEmail } = require('../../services/email/send-email');
const twoFactorCodeTemplate = require('../../utils/templates/two-factor-code');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');
const logger = require('../../utils/logger');

const TWO_FACTOR_CODE_TTL_MS = 15 * 60 * 1000;
const TWO_FACTOR_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;

const invalidCredentials = (res) => errorHandler(res, 401, 'Ошибка авторизации', [
    { path: 'login', message: 'Неверный логин или пароль' }
]);

module.exports = async (req, res) => {
    const { login: userLogin, password } = req.validatedData.body;

    try {
        const user = await PlatformUser.findOne({ login: userLogin }).select(
            '+password +twoFactorCode +twoFactorCodeSentAt +twoFactorAttempts'
        );

        if (!user || !(await comparePassword(password, user.password))) {
            await logHandler({
                action: ACTIONS_CONFIG.AUTH.actions.LOGIN_FAILED.key,
                message: `Неудачная попытка входа с логином "${userLogin}"`,
                userId: user?._id ?? null,
                status: 'error'
            });

            return invalidCredentials(res);
        }

        // Заблокированный аккаунт не должен даже получать код подтверждения.
        if (user.status === 'blocked') {
            return errorHandler(res, 403, 'Доступ запрещён', [
                { path: 'login', message: 'Ваш аккаунт заблокирован' }
            ]);
        }

        const now = new Date();

        if (user.twoFactorCode && user.twoFactorCodeSentAt) {
            const sentAt = new Date(user.twoFactorCodeSentAt);
            const codeExpired = now > new Date(sentAt.getTime() + TWO_FACTOR_CODE_TTL_MS);
            const isBlocked = user.twoFactorAttempts >= MAX_ATTEMPTS;

            if (!codeExpired && !isBlocked) {
                return successHandler(res, 200, 'Код подтверждения уже отправлен на вашу почту', null);
            }

            if (isBlocked) {
                const cooldownEnd = new Date(sentAt.getTime() + TWO_FACTOR_COOLDOWN_MS);
                if (now < cooldownEnd) {
                    const remainingMin = Math.ceil((cooldownEnd - now) / 60000);
                    return errorHandler(res, 429, `Превышено количество попыток. Повторите через ${remainingMin} мин.`, [
                        { path: 'code', message: 'Слишком много неудачных попыток ввода кода' }
                    ]);
                }
            }
        }

        const plainCode = String(crypto.randomInt(100000, 1000000));

        await PlatformUser.findByIdAndUpdate(user._id, {
            twoFactorCode: await hashPassword(plainCode),
            twoFactorCodeSentAt: now,
            twoFactorAttempts: 0
        });

        await sendEmail({
            email: user.email,
            subject: 'Код подтверждения входа — Operon',
            html: twoFactorCodeTemplate({ firstName: user.firstName, code: plainCode })
        });

        await logHandler({
            action: ACTIONS_CONFIG.AUTH.actions.TWO_FACTOR_SENT.key,
            message: `Код двухфакторной аутентификации отправлен пользователю ${userLogin}`,
            userId: user._id,
            status: 'success'
        });

        return successHandler(res, 200, 'Код подтверждения отправлен на вашу почту', null);

    } catch (error) {
        logger.error('Ошибка при входе', null, error.message);

        await logHandler({
            action: ACTIONS_CONFIG.AUTH.actions.SERVER_ERROR.key,
            message: `Ошибка сервера при входе: ${error.message}`,
            userId: null,
            status: 'error'
        });

        return errorHandler(res, 500, 'Ошибка сервера', [
            { path: 'server', message: 'Не удалось выполнить вход' }
        ]);
    }
};
