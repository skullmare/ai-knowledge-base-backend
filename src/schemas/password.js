const { z } = require('zod');
const PlatformUser = require('../models/platform-user');

const changePasswordSchema = z.object({
    body: z.object({
        oldPassword: z
            .string('Текущий пароль обязателен для заполнения')
            .min(1, 'Введите текущий пароль'),
        newPassword: z
            .string('Новый пароль обязателен для заполнения')
            .min(10, 'Новый пароль должен содержать минимум 10 символов')
            .max(100, 'Новый пароль должен быть не более 100 символов'),
        confirmPassword: z
            .string('Повтор нового пароля обязателен для заполнения')
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Пароли не совпадают",
        path: ["confirmPassword"],
    })
    .refine((data) => data.oldPassword !== data.newPassword, {
        message: "Новый пароль не должен совпадать со старым",
        path: ["newPassword"],
    })
});

const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.email("Некорректный формат email")
    })
    .superRefine(async (data, ctx) => {
        const user = await PlatformUser.findOne({ email: data.email });
        if (!user) {
            ctx.addIssue({
                message: "Пользователь с таким email не найден",
                path: ["email"],
            });
        }
    })
});

const resetPasswordSchema = z.object({
    params: z.object({
        token: z.string().min(1, 'Токен обязателен')
    }),
    body: z.object({
        password: z
            .string('Новый пароль обязателен для заполнения')
            .min(10, 'Новый пароль должен содержать минимум 10 символов')
            .max(100, 'Новый пароль должен быть не более 100 символов'),
        confirmPassword: z
            .string('Повтор нового пароля обязателен для заполнения')
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Пароли не совпадают",
        path: ["confirmPassword"],
    })
});

module.exports = {
    changePasswordSchema, 
    forgotPasswordSchema, 
    resetPasswordSchema 
};