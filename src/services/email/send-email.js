
const nodemailer = require('nodemailer');
const logger = require('../../utils/logger');

const sendEmail = async (options) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT),
            secure: process.env.EMAIL_PORT == 465, 
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: `Operon Support <${process.env.EMAIL_FROM}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
            html: options.html,
        };

        const info = await transporter.sendMail(mailOptions);
        logger.success(`[Email-Success]: ID ${info.messageId}`);
        return info;
    } catch (error) {
        logger.error(`[Email-Error]: ${error.message}`);
        throw new Error('Ошибка при отправке почты', { cause: error });
    }
};

module.exports = { sendEmail };