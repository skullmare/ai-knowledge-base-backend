const mongoose = require('mongoose');
const { z } = require('zod');

// --- Вспомогательные функции (могут быть вынесены в общий файл utils/zod.utils.js) ---

const objectId = z.string()
    .trim()
    .refine(v => mongoose.Types.ObjectId.isValid(v), "Некорректный ID");

/**
 * Проверка уникальности логина/email с учетом исключения текущего пользователя
 */
const fieldIsUnique = (modelName, fieldName, currentUserId = null) => async (value, ctx) => {
    const query = { [fieldName]: value.toLowerCase() };
    if (currentUserId) {
        query._id = { $ne: currentUserId };
    }

    const exists = await mongoose.model(modelName).exists(query);
    if (exists) {
        ctx.addIssue({
            code: 'custom',
            message: `Этот ${fieldName === 'login' ? 'логин' : 'email'} уже занят`
        });
    }
};

// --- Схема профиля ---

const updateMeSchema = z.object({
    userId: objectId,
    body: z.object({
        firstName: z.string().trim().min(1, "Поле имени не может быть пустым").optional(),
        lastName: z.string().trim().min(1, "Поле фамилия не может быть пустой").optional(),
        login: z.string().trim().min(3, "Логин должен быть не менее 3 символов")
            .transform(val => val.toLowerCase()).optional(),
        email: z.string().email("Некорректный формат email")
            .transform(val => val.toLowerCase()).optional(),
        photoUrl: z.string().url("Некорректная ссылка на фото").optional().or(z.literal('')),
    })
}).superRefine(async (data, ctx) => {
    const { userId, body } = data;

    // 1. Проверка существования пользователя и получение инстанса для контроллера
    const user = await mongoose.model('User').findById(userId);
    if (!user) {
        ctx.addIssue({ code: 'custom', path: ['userId'], message: 'Пользователь не найден' });
        return;
    }

    // 2. Проверка уникальности логина, если он передан
    if (body.login && body.login !== user.login) {
        await fieldIsUnique('User', 'login', userId)(body.login, ctx);
    }

    // 3. Проверка уникальности email, если он передан
    if (body.email && body.email !== user.email) {
        await fieldIsUnique('User', 'email', userId)(body.email, ctx);
    }

    // Сохраняем пользователя в объект данных, чтобы не делать findById повторно в контроллере
    data.userInstance = user;
});

module.exports = {
    updateMeSchema
};