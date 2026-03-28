const passwordResetTemplate = (resetUrl) => {
    return `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #007bff;">Сброс пароля в Operon</h2>
            <p>Вы получили это письмо, так как запросили восстановление доступа к своему аккаунту.</p>
            <p>Нажмите на кнопку ниже, чтобы установить новый пароль:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="display: inline-block; padding: 12px 25px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   Сбросить пароль
                </a>
            </div>

            <p style="font-size: 14px; color: #555;">
                Если кнопка не работает, скопируйте и вставьте эту ссылку в адресную строку браузера:
                <br>
                <span style="color: #007bff; word-break: break-all;">${resetUrl}</span>
            </p>

            <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
            
            <p style="font-size: 12px; color: #999;">
                Ссылка действительна в течение 1 часа. Если вы не запрашивали сброс, просто проигнорируйте это письмо — ваш пароль останется в безопасности.
            </p>
        </div>
    `;
};

module.exports = passwordResetTemplate;