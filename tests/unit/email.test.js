// Префикс mock обязателен: только такие переменные jest разрешает
// использовать внутри фабрики jest.mock.
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'abc' });

jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({ sendMail: mockSendMail }))
}));

const loadService = () => {
    jest.resetModules();
    return jest.requireActual('../../src/services/email/send-email');
};

describe('services/email/send-email', () => {
    it('отправляет письмо с отправителем из окружения', async () => {
        const { sendEmail } = loadService();

        await sendEmail({ email: 'user@example.com', subject: 'Тема', html: '<b>Текст</b>' });

        expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'user@example.com',
            subject: 'Тема',
            html: '<b>Текст</b>',
            from: expect.stringContaining(process.env.EMAIL_FROM)
        }));
    });

    it('пробрасывает ошибку доставки вызывающему коду', async () => {
        const { sendEmail } = loadService();
        mockSendMail.mockRejectedValueOnce(new Error('SMTP недоступен'));

        await expect(sendEmail({ email: 'user@example.com', subject: 'Тема' }))
            .rejects.toThrow('Ошибка при отправке почты');
    });
});

describe('шаблоны писем', () => {
    const twoFactorCode = require('../../src/utils/templates/two-factor-code');
    const passwordReset = require('../../src/utils/templates/password-reset');
    const welcomeUser = require('../../src/utils/templates/welcome-user');

    it('шаблон 2FA содержит код и имя получателя', () => {
        const html = twoFactorCode({ firstName: 'Иван', code: '123456' });

        expect(html).toContain('123456');
        expect(html).toContain('Иван');
    });

    it('шаблон восстановления содержит ссылку', () => {
        const html = passwordReset('https://app.example.com/reset-password/token123');

        expect(html).toContain('https://app.example.com/reset-password/token123');
    });

    it('приветственный шаблон содержит логин и пароль', () => {
        const html = welcomeUser({ firstName: 'Иван', login: 'ivan', password: 'Secret123' });

        expect(html).toContain('ivan');
        expect(html).toContain('Secret123');
    });
});
