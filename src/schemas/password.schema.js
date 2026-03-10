const { z } = require('zod');
const User = require('../models/platformUser');

const changePasswordSchema = z.object({
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
});

/**
 * 1. Схема для запроса сброса пароля (Forgot Password)
 * Используется, когда пользователь вводит email, чтобы получить ссылку.
 */
const forgotPasswordSchema = z.object({
    email: z
        .string('Поле email обязателено для заполнения')
        .trim()
        .lowercase()
        .email('Введите корректный email адрес')
})
.superRefine(async (data, ctx) => {
    const user = await User.findOne({ email: data.email });
    if (!user) {
        ctx.addIssue({
            message: "Пользователь с таким email не найден",
            path: ["email"],
        });
    }
});

/**
 * 2. Схема для установки нового пароля (Reset Password)
 * Используется, когда пользователь уже перешел по ссылке из письма.
 */
const resetPasswordSchema = z.object({
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
});

module.exports = {
    changePasswordSchema, 
    forgotPasswordSchema, 
    resetPasswordSchema 
};