const { z } = require('zod');

const verifyTwoFactorSchema = z.object({
    body: z.object({
        login: z
            .string('Логин обязателен для заполнения')
            .min(1, 'Введите логин'),
        code: z
            .string('Код обязателен для заполнения')
            .length(6, 'Код должен содержать 6 цифр')
            .regex(/^\d{6}$/, 'Код должен состоять из 6 цифр')
    })
});

module.exports = { verifyTwoFactorSchema };
