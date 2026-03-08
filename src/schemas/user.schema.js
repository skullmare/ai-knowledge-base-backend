const mongoose = require('mongoose');
const { z } = require('zod');

// --- Вспомогательные функции ---

const objectId = z.string()
    .trim()
    .refine(v => mongoose.Types.ObjectId.isValid(v), "Некорректный ID");

const dbExists = (modelName) => async (id, ctx) => {
    const exists = await mongoose.model(modelName).exists({ _id: id });
    if (!exists) ctx.addIssue({ code: 'custom', message: `${modelName} не найден` });
};

/**
 * Проверка уникальности логина
 * @param {String} currentUserId - (Опционально) ID текущего пользователя, чтобы игнорировать его при обновлении
 */
const loginIsUnique = (currentUserId = null) => async (login, ctx) => {
    const query = { login: login.toLowerCase() };
    if (currentUserId) {
        query._id = { $ne: currentUserId };
    }

    const exists = await mongoose.model('User').exists(query);
    if (exists) {
        ctx.addIssue({
            code: 'custom',
            path: ['login'],
            message: 'Этот логин уже занят другим пользователем'
        });
    }
};

// --- Схемы для контроллеров ---

/**
 * createUser.controller.js
 */
const createUserSchema = z.object({
    body: z.object({
        firstName: z.string().trim().min(1, "Имя обязательно"),
        lastName: z.string().trim().min(1, "Фамилия обязательна"),
        // Простая проверка уникальности для нового пользователя
        login: z.string()
            .trim()
            .min(3, "Логин должен быть не менее 3 символов")
            .transform(val => val.toLowerCase())
            .superRefine(loginIsUnique()),
        email: z.string().email("Некорректный email").lowercase().optional(),
        password: z.string().min(10, "Пароль должен быть не менее 10 символов"),
        role: objectId.pipe(z.string().superRefine(dbExists('Role'))),
        photoUrl: z.string().url("Некорректная ссылка на фото").optional().or(z.literal('')),
        status: z.enum(['active', 'blocked']).default('active')
    })
});

/**
 * updateUser.controller.js
 */
const updateUserSchema = z.object({
    params: z.object({
        id: objectId // Просто проверяем формат ID
    }),
    body: z.object({
        firstName: z.string().trim().min(1).optional(),
        lastName: z.string().trim().min(1).optional(),
        login: z.string().trim().min(3).transform(val => val.toLowerCase()).optional(),
        email: z.string().email().lowercase().optional(),
        password: z.string().min(10).optional(),
        role: objectId.pipe(z.string().superRefine(dbExists('Role'))).optional(), // Проверка, что новая роль существует
        photoUrl: z.string().url().optional().or(z.literal('')),
        status: z.enum(['active', 'blocked']).optional()
    })
}).superRefine(async (data, ctx) => {
    // 1. Получаем данные пользователя ОДНИМ запросом
    const user = await mongoose.model('User').findById(data.params.id).select('isSystem');

    if (!user) {
        ctx.addIssue({ code: 'custom', path: ['params', 'id'], message: 'Пользователь не найден' });
        return;
    }

    // 2. БИЗНЕС-ЛОГИКА: Если системный, запрещаем менять роль
    if (user.isSystem && data.body.role) {
        ctx.addIssue({
            code: 'custom',
            path: ['body', 'role'],
            message: 'У системного пользователя нельзя изменять роль'
        });
    }

    // 3. Проверка уникальности логина (если он пришел в body)
    if (data.body.login) {
        await loginIsUnique(data.params.id)(data.body.login, ctx);
    }
});

/**
 * Остальные схемы остаются без изменений
 */
const getAllUsersSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).default("1"),
        limit: z.string().regex(/^\d+$/).transform(Number).default("10"),
        search: z.string().optional(),
        role: objectId.optional(),
        status: z.enum(['active', 'blocked']).optional()
    })
});

const getOneUserSchema = z.object({
    params: z.object({
        id: objectId.pipe(z.string().superRefine(dbExists('User')))
    })
});

const deleteUserSchema = z.object({
    params: z.object({
        id: objectId.pipe(z.string().superRefine(async (id, ctx) => {
            const user = await mongoose.model('User').findById(id).select('isSystem');
            if (!user) {
                ctx.addIssue({ code: 'custom', path: ['id'], message: 'Пользователь не найден' });
                return;
            }
            if (user.isSystem) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['id'], // явно указываем, что проблема в ID
                    message: 'Системного пользователя нельзя удалять'
                });
            }
        }))
    })
});

module.exports = {
    createUserSchema,
    updateUserSchema,
    getAllUsersSchema,
    getOneUserSchema,
    deleteUserSchema
};