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

const loginIsUnique = (currentUserId = null) => async (login, ctx) => {
    const query = { login: login.toLowerCase() };
    if (currentUserId) {
        query._id = { $ne: currentUserId };
    }

    const exists = await mongoose.model('PlatformUser').exists(query);
    if (exists) {
        ctx.addIssue({
            code: 'custom',
            path: ['body', 'login'],
            message: 'Этот логин уже занят другим пользователем'
        });
    }
};

const createUserSchema = z.object({
    body: z.object({
        firstName: z.string("Имя обязательно").trim().min(1, "Поле имени не может быть пустым").max(100, "Максимальная длинна имени 100 символов"),
        lastName: z.string("Фамилия обязательна").trim().min(1, "Поле фамилия не может быть пустым").max(100, "Максимальная длинна фамилии 100 символов"),
        login: z.string("Логин обязателен")
            .trim()
            .min(3, "Логин должен быть не менее 3 символов")
            .max(30, "Логин должен быть не более 30 символов")
            .transform(val => val.toLowerCase())
            .superRefine(loginIsUnique()),
        email: z.email("Некорректный формат email"),
        role: objectId.pipe(z.string("Роль обязательна").superRefine(dbExists('PlatformRole'))),
        photoUrl: z.string().url("Некорректная ссылка на фото").optional().or(z.literal('')),
        status: z.enum(['active', 'blocked'], "Недопустимый статус. Доступны: active, blocked").default('active')
    })
});

const updateUserSchema = z.object({
    params: z.object({
        id: objectId
    }),
    body: z.object({
        firstName: z.string().trim().min(1, "Поле имени не может быть пустым").max(100, "Максимальная длинна имени 100 символов").optional(),
        lastName: z.string().trim().min(1, "Поле фамилия не может быть пустым").max(100, "Максимальная длинна фамилии 100 символов").optional(),
        login: z.string().trim().min(3, "Логин должен быть не менее 3 символов").max(30, "Логин должен быть не более 30 символов").transform(val => val.toLowerCase()).optional(),
        email: z.email("Некорректный формат email").optional(),
        password: z.string().min(10, "Пароль должен быть не менее 10 символов").max(100, "Пароль должен быть не более 100 символов").optional(),
        role: objectId.pipe(z.string().superRefine(dbExists('PlatformRole'))).optional(),
        photoUrl: z.string().url("Некорректная ссылка на фото").optional().or(z.literal('')),
        status: z.enum(['active', 'blocked'], "Недопустимый статус. Доступны: active, blocked").optional()
    })
}).superRefine(async (data, ctx) => {
    if (!mongoose.Types.ObjectId.isValid(data.params.id)) return;

    const user = await mongoose.model('PlatformUser').findById(data.params.id).select('isSystem');

    if (!user) {
        ctx.addIssue({ code: 'custom', path: ['params', 'id'], message: 'Пользователь не найден' });
        return;
    }

    if (user.isSystem && data.body.role) {
        ctx.addIssue({
            code: 'custom',
            path: ['body', 'role'],
            message: 'У системного пользователя нельзя изменять роль'
        });
    }

    if (user.isSystem && data.body.status) {
        ctx.addIssue({
            code: 'custom',
            path: ['body', 'status'],
            message: 'У системного пользователя нельзя изменять статус'
        });
    }

    if (data.body.login) {
        await loginIsUnique(data.params.id)(data.body.login, ctx);
    }
});

const getAllUsersSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/, "Номер страницы должен быть числом").transform(Number).default("1"),
        limit: z.string().regex(/^\d+$/, "Лимит должен быть числом").transform(Number).default("10"),
        search: z.string().optional(),
        role: objectId.optional(),
        status: z.enum(['active', 'blocked'], "Недопустимый статус. Доступны: active, blocked").optional()
    })
});

const getOneUserSchema = z.object({
    params: z.object({
        id: objectId.pipe(z.string().superRefine(dbExists('PlatformUser')))
    })
});

const deleteUserSchema = z.object({
    params: z.object({
        id: objectId.pipe(z.string().superRefine(async (id, ctx) => {
            const user = await mongoose.model('PlatformUser').findById(id).select('isSystem');
            if (!user) {
                ctx.addIssue({ code: 'custom', path: ['params', 'id'], message: 'Пользователь не найден' });
                return;
            }
            if (user.isSystem) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['params', 'id'],
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