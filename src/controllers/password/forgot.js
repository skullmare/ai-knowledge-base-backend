const crypto = require('crypto');
const PlatformUser = require('../../models/platform-user');
const { sendEmail } = require('../../services/email/send-email');
const passwordResetTemplate = require('../../utils/templates/password-reset');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const logger = require('../../utils/logger');
const { ACTIONS_CONFIG } = require('../../constants/actions');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

// Ответ одинаков для существующего и несуществующего адреса —
// иначе форма восстановления превращается в проверку наличия аккаунта.
const GENERIC_MESSAGE = 'Если аккаунт с таким email существует, инструкции отправлены на почту';

module.exports = async (req, res) => {
    const { email } = req.validatedData.body;

    try {
        const user = await PlatformUser.findOne({ email });

        if (!user) {
            logger.warn(`Запрошен сброс пароля для несуществующего email ${email}`);
            return successHandler(res, 200, GENERIC_MESSAGE, {});
        }

        const resetToken = crypto.randomBytes(32).toString('hex');

        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
        await user.save({ validateBeforeSave: false });

        const resetUrl = new URL(resetToken, `${(process.env.RESET_PASSWORD_URL || '').replace(/\/?$/, '/')}`).href;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Восстановление пароля - Operon',
                html: passwordResetTemplate(resetUrl)
            });
        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save({ validateBeforeSave: false });

            return errorHandler(res, 500, 'Не удалось отправить письмо', [
                { path: 'email', message: error.message }
            ]);
        }

        await logHandler({
            action: ACTIONS_CONFIG.PASSWORD.actions.PASSWORD_RESET_REQUEST.key,
            message: `Запрошен сброс пароля для ${email}`,
            userId: user._id,
            entityId: user._id,
            status: 'success'
        });

        return successHandler(res, 200, GENERIC_MESSAGE, {});

    } catch (error) {
        return errorHandler(res, 500, 'Ошибка при запросе сброса пароля', [
            { path: 'server', message: error.message }
        ]);
    }
};
