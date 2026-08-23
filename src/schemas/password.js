const { z } = require('zod');

const passwordField = (label) => z
    .string(`${label} обязателен для заполнения`)
    .min(10, `${label} должен содержать минимум 10 символов`)
    .max(100, `${label} должен быть не более 100 символов`);

const changePasswordSchema = z.object({
    body: z.object({
        oldPassword: z.string('Текущий пароль обязателен для заполнения').min(1, 'Введите текущий пароль'),
        newPassword: passwordField('Новый пароль'),
        confirmPassword: z.string('Повтор нового пароля обязателен для заполнения')
    })
        .refine(data => data.newPassword === data.confirmPassword, {
            message: 'Пароли не совпадают',
            path: ['confirmPassword']
        })
        .refine(data => data.oldPassword !== data.newPassword, {
            message: 'Новый пароль не должен совпадать со старым',
            path: ['newPassword']
        })
});

// Существование email здесь намеренно не проверяется:
// разная реакция на known/unknown адрес позволяет перебирать пользователей.
const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.email('Некорректный формат email').transform(value => value.toLowerCase())
    })
});

const resetPasswordSchema = z.object({
    params: z.object({
        token: z.string().trim().min(1, 'Токен обязателен')
    }),
    body: z.object({
        password: passwordField('Новый пароль'),
        confirmPassword: z.string('Повтор нового пароля обязателен для заполнения')
    }).refine(data => data.password === data.confirmPassword, {
        message: 'Пароли не совпадают',
        path: ['confirmPassword']
    })
});

module.exports = { changePasswordSchema, forgotPasswordSchema, resetPasswordSchema };
