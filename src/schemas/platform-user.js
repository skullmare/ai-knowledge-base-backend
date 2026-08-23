const mongoose = require('mongoose');
const { z } = require('zod');
const { objectId: objectIdSchema, dbExists, paginationQuery } = require('./common');

const objectId = objectIdSchema();

// path указывается только при проверке на уровне объекта: внутри
// superRefine поля zod дописывает путь сам, иначе получается "login.login".
const fieldIsUnique = (field, message) => (currentUserId = null, path) => async (value, ctx) => {
    const query = { [field]: String(value).toLowerCase() };
    if (currentUserId) query._id = { $ne: currentUserId };

    if (await mongoose.model('PlatformUser').exists(query)) {
        ctx.addIssue({ code: 'custom', message, ...(path ? { path } : {}) });
    }
};

const loginIsUnique = fieldIsUnique('login', 'Этот логин уже занят другим пользователем');
const emailIsUnique = fieldIsUnique('email', 'Этот email уже занят другим пользователем');

const createUserSchema = z.object({
    body: z.object({
        firstName: z.string("Имя обязательно").trim().min(1, "Поле имени не может быть пустым").max(50, "Максимальная длинна имени 50 символов"),
        lastName: z.string("Фамилия обязательна").trim().min(1, "Поле фамилия не может быть пустым").max(50, "Максимальная длинна фамилии 50 символов"),
        login: z.string("Логин обязателен")
            .trim()
            .min(3, "Логин должен быть не менее 3 символов")
            .max(30, "Логин должен быть не более 30 символов")
            .transform(val => val.toLowerCase())
            .superRefine(loginIsUnique()),
        email: z.email("Некорректный формат email").superRefine(emailIsUnique()),
        role: objectId.pipe(z.string("Роль обязательна").superRefine(dbExists('PlatformRole'))),
        photoUrl: z.url("Некорректная ссылка на фото").optional().or(z.literal('')),
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
        role: objectId.pipe(z.string().superRefine(dbExists('PlatformRole'))).optional(),
        photoUrl: z.url("Некорректная ссылка на фото").optional().or(z.literal('')),
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
        await loginIsUnique(data.params.id, ['body', 'login'])(data.body.login, ctx);
    }

    if (data.body.email) {
        await emailIsUnique(data.params.id, ['body', 'email'])(data.body.email, ctx);
    }
});

const getAllUsersSchema = z.object({
    query: z.object({
        ...paginationQuery(10),
        search: z.string().trim().optional(),
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