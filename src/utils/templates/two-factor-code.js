const twoFactorCodeTemplate = ({ firstName, code }) => {
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
                                    <p style="margin:8px 0 0 0;font-size:14px;color:#C1C1C1;">Подтверждение входа</p>
                                </td>
                            </tr>

                            <!-- Body -->
                            <tr>
                                <td style="padding:32px;">
                                    <p style="margin:0 0 8px 0;font-size:16px;color:#FFFFFF;line-height:1.5;">
                                        Здравствуйте, <strong style="color:#DDB364;">${firstName}</strong>!
                                    </p>
                                    <p style="margin:0 0 24px 0;font-size:14px;color:#C1C1C1;line-height:1.625;">
                                        Для завершения входа в систему введите код подтверждения:
                                    </p>

                                    <!-- Code block -->
                                    <div style="text-align:center;margin-bottom:24px;">
                                        <div style="display:inline-block;background-color:#282828;border:1px solid #BE9956;border-radius:8px;padding:20px 40px;">
                                            <span style="font-size:36px;font-weight:700;color:#DDB364;letter-spacing:0.2em;">${code}</span>
                                        </div>
                                    </div>

                                    <p style="margin:0;font-size:13px;color:#7A7A7A;line-height:1.625;">
                                        Код действителен в течение <strong style="color:#C1C1C1;">15 минут</strong>. У вас есть <strong style="color:#C1C1C1;">3 попытки</strong> для ввода кода. Если вы не запрашивали вход — немедленно смените пароль.
                                    </p>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="padding:20px 32px;border-top:1px solid #BE995680;">
                                    <p style="margin:0;font-size:12px;color:#7A7A7A;">
                                        Это письмо сгенерировано автоматически — отвечать на него не нужно.
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

module.exports = twoFactorCodeTemplate;
