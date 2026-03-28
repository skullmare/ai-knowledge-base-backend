const crypto = require('crypto');
const PlatformUser = require('../../models/platform-user');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');
const logHandler = require('../../utils/log-handler');
const { ACTIONS_CONFIG } = require('../../constants/actions');
const passwordResetTemplate = require('../../utils/templates/password-reset');
const sendEmail = require("../../services/email/send-email");

module.exports = async (req, res) => {
    const { email } = req.validatedData.body;

    try {
        const user = await PlatformUser.findOne({ email });

        const resetToken = crypto.randomBytes(32).toString('hex');

        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 3600000;

        await user.save({ validateBeforeSave: false });

        const resetUrl = new URL(resetToken, process.env.RESET_PASSWORD_URL.replace(/\/?$/, '/')).href;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Восстановление пароля - Operon',
                html: passwordResetTemplate(resetUrl)
            });
        } catch (err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save({ validateBeforeSave: false });

            return errorHandler(res, 500, 'Не удалось отправить письмо', [{ path: 'email', message: err.message }]);
        }

        await logHandler({
            action: ACTIONS_CONFIG.PASSWORD.actions.PASSWORD_RESET_REQUEST.key,
            message: `Запрошен сброс пароля для ${email}`,
            userId: user._id,
            status: 'success'
        });

        const responseData = {};
        
        if (process.env.NODE_ENV === 'development') {
            responseData.token = resetToken;
        }

        return successHandler(
            res, 
            200, 
            'Инструкции отправлены на почту', 
            responseData
        );

    } catch (error) {
        return errorHandler(res, 500, 'Ошибка при запросе сброса пароля', [
            { path: 'server', message: error.message }
        ]);
    }
};