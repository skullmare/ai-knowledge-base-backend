const { z } = require('zod');

const loginSchema = z.object({
    body: z.object({
        login: z
            .string('Логин обязателен для заполнения')
            .trim()
            .min(1, 'Введите логин')
            .max(30, 'Логин должен быть не более 30 символов')
            .transform(value => value.toLowerCase()),
        password: z
            .string('Пароль обязателен для заполнения')
            .min(1, 'Введите пароль')
            .max(100, 'Пароль должен быть не более 100 символов')
    })
});

const verifyTwoFactorSchema = z.object({
    body: z.object({
        login: z
            .string('Логин обязателен для заполнения')
            .trim()
            .min(1, 'Введите логин')
            .transform(value => value.toLowerCase()),
        code: z
            .string('Код обязателен для заполнения')
            .regex(/^\d{6}$/, 'Код должен состоять из 6 цифр')
    })
});

module.exports = { loginSchema, verifyTwoFactorSchema };
