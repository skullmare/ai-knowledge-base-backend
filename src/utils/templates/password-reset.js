const passwordResetTemplate = (resetUrl) => {
    return `
        <!DOCTYPE html>
        <html lang="ru">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background-color:#111111;font-family:sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#111111;padding:40px 16px;">
                <tr>
                    <td align="center">
                        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#1C1C1C;border-radius:8px;border:1px solid #BE9956;overflow:hidden;">

                            <!-- Header -->
                            <tr>
                                <td style="padding:32px 32px 24px 32px;border-bottom:1px solid #BE995680;">
                                    <h1 style="margin:0;font-size:24px;font-weight:700;color:#DDB364;line-height:1.25;">Operon</h1>
                                    <p style="margin:8px 0 0 0;font-size:14px;color:#C1C1C1;">Восстановление пароля</p>
                                </td>
                            </tr>

                            <!-- Body -->
                            <tr>
                                <td style="padding:32px;">
                                    <p style="margin:0 0 16px 0;font-size:16px;color:#FFFFFF;line-height:1.5;">
                                        Вы получили это письмо, так как запросили восстановление доступа к своему аккаунту.
                                    </p>
                                    <p style="margin:0 0 24px 0;font-size:14px;color:#C1C1C1;line-height:1.625;">
                                        Нажмите на кнопку ниже, чтобы установить новый пароль:
                                    </p>

                                    <div style="text-align:center;margin-bottom:24px;">
                                        <a href="${resetUrl}"
                                           style="display:inline-block;padding:12px 28px;background-color:#DDB364;color:#111111;text-decoration:none;border-radius:6px;font-size:14px;font-weight:700;line-height:1.25;">
                                            Сбросить пароль
                                        </a>
                                    </div>

                                    <p style="margin:0;font-size:13px;color:#7A7A7A;line-height:1.625;">
                                        Если кнопка не работает, скопируйте и вставьте эту ссылку в адресную строку браузера:
                                        <br>
                                        <span style="color:#DDB364;word-break:break-all;">${resetUrl}</span>
                                    </p>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="padding:20px 32px;border-top:1px solid #BE995680;">
                                    <p style="margin:0;font-size:12px;color:#7A7A7A;line-height:1.5;">
                                        Ссылка действительна в течение 1 часа. Если вы не запрашивали сброс — просто проигнорируйте это письмо, ваш пароль останется в безопасности.
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
};

module.exports = passwordResetTemplate;
