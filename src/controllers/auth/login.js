const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const PlatformUser = require('../../models/platform-user');
const { comparePassword } = require('../../utils/password-handler');
const { sendEmail } = require('../../services/email/send-email');
const twoFactorCodeTemplate = require('../../utils/templates/two-factor-code');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');
const logger = require('../../utils/logger');

const TWO_FACTOR_CODE_TTL_MS = 15 * 60 * 1000;
const TWO_FACTOR_COOLDOWN_MS = 5 * 60 * 1000;

module.exports = async (req, res) => {
    try {
        const { login: userLogin, password } = req.body;
        const user = await PlatformUser.findOne({ login: userLogin }).select(
            '+password +twoFactorCode +twoFactorCodeSentAt +twoFactorAttempts'
        );

        if (!user || !(await comparePassword(password, user.password))) {

            return errorHandler(res, 401, 'Ошибка авторизации', [
                { path: 'login', message: 'Неверный логин или пароль' }
            ]);
        }

        const now = new Date();

        if (user.twoFactorCode && user.twoFactorCodeSentAt) {
            const sentAt = new Date(user.twoFactorCodeSentAt);
            const codeExpired = now > new Date(sentAt.getTime() + TWO_FACTOR_CODE_TTL_MS);
            const isBlocked = user.twoFactorAttempts >= 3;

            if (!codeExpired && !isBlocked) {
                return successHandler(res, 200, 'Код подтверждения уже отправлен на вашу почту');
            }

            if (isBlocked) {
                const cooldownEnd = new Date(sentAt.getTime() + TWO_FACTOR_COOLDOWN_MS);
                if (now < cooldownEnd) {
                    const remainingMs = cooldownEnd - now;
                    const remainingMin = Math.ceil(remainingMs / 60000);
                    return errorHandler(res, 429, `Превышено количество попыток. Повторите через ${remainingMin} мин.`);
                }
            }
        }

        const plainCode = String(crypto.randomInt(100000, 1000000));
        const salt = await bcrypt.genSalt(10);
        const hashedCode = await bcrypt.hash(plainCode, salt);

        await PlatformUser.findByIdAndUpdate(user._id, {
            twoFactorCode: hashedCode,
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

        return successHandler(res, 200, 'Код подтверждения отправлен на вашу почту');

    } catch (error) {
        logger.error('Ошибка при входе', null, error.message);
        await logHandler({
            action: ACTIONS_CONFIG.AUTH.actions.SERVER_ERROR.key,
            message: `Ошибка сервера при входе: ${error.message}`,
            userId: null,
            status: 'error'
        });

        return errorHandler(res, 500, 'Ошибка сервера', [
            { path: 'server', message: error.message }
        ]);
    }
};
