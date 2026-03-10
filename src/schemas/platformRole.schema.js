const mongoose = require('mongoose');
const { z } = require('zod');
const { ALL_PERMISSIONS } = require('../constants/permissions');

// --- Вспомогательные функции ---

const objectId = z.string()
    .trim()
    .refine(v => mongoose.Types.ObjectId.isValid(v), "Некорректный ID");

/**
 * Проверка уникальности названия роли
 */
const roleNameIsUnique = (currentRoleId = null) => async (name, ctx) => {
    const query = { name: name.trim() };
    if (currentRoleId) {
        query._id = { $ne: currentRoleId };
    }

    const exists = await mongoose.model('Role').exists(query);
    if (exists) {
        ctx.addIssue({
            code: 'custom',
            path: ['name'],
            message: 'Роль с таким названием уже существует'
        });
    }
};

// --- Схемы для контроллеров ---

/**
 * Схема создания роли
 */
const createRoleSchema = z.object({
    body: z.object({
        name: z
            .string("Название роли обязательно для заполнения")
            .trim()
            .min(1, "Название роли не может быть пустым")
            .max(100, "Название роли не может быть более 100 символов")
            .superRefine(roleNameIsUnique()),
        permissions: z.array(z.enum(ALL_PERMISSIONS, "Выбрано некорректное разрешение"), "Укажите список доступный разрешений для этой роли"),
        description: z
            .string("Описание роли обязательно для заполнения")
            .trim()
            .min(1, "Описание роли не может быть пустым")
            .max(1000, "Описание роли не может быть более 1000 символов")
    }),
});

/**
 * Схема обновления роли
 */
const updateRoleSchema = z.object({
    params: z.object({
        id: objectId
    }),
    body: z.object({
        name: z
            .string()
            .trim()
            .min(1, "Название роли не может быть пустым")
            .max(100, "Название роли не может быть более 100 символов")
            .optional(),
        permissions: z.array(z.enum(ALL_PERMISSIONS, "Одно или несколько прав доступа не существуют")).min(1, "Список прав не может быть пустым").optional(),
        description: z
            .string()
            .trim()
            .min(1, "Описание роли не может быть пустым")
            .max(1000, "Описание роли не может быть более 1000 символов")
            .optional()
    })
}).superRefine(async (data, ctx) => {
    const role = await mongoose.model('Role').findById(data.params.id);

    if (!role) {
        ctx.addIssue({ code: 'custom', path: ['params', 'id'], message: 'Роль не найдена' });
        return;
    }

    if (role.isSystem && data.body.permissions) {
        ctx.addIssue({
            code: 'custom',
            path: ['body'],
            message: 'У системной роли нельзя изменять права доступа'
        });
    }

    if (data.body.name) {
        await roleNameIsUnique(data.params.id)(data.body.name, ctx);
    }
});

/**
 * Схема удаления роли (с проверками из вашего pre-hook)
 */
const deleteRoleSchema = z.object({
    params: z.object({
        id: objectId.pipe(z.string().superRefine(async (id, ctx) => {
            const role = await mongoose.model('Role').findById(id);

            if (!role) {
                ctx.addIssue({ code: 'custom', message: 'Роль не найдена' });
                return;
            }

            if (role.isSystem) {
                ctx.addIssue({
                    code: 'custom',
                    message: `Роль ${role.name} является системной и не может быть удалена`
                });
                return;
            }

            const PlatformUser = mongoose.model('User');
            const isAssigned = await PlatformUser.exists({ role: id });

            if (isAssigned) {
                ctx.addIssue({
                    code: 'custom',
                    message: `Нельзя удалить роль, так как она назначена пользователям`
                });
            }
        }))
    })
});

/**
 * Схема для массового удаления ролей
 */
const deleteRoleListSchema = z.object({
    body: z.object({
        ids: z.array(objectId)
            .min(1, "Список ролей не может быть пустым")
            .pipe(z.array(z.string()).superRefine(async (ids, ctx) => {
                const Role = mongoose.model('Role');
                const PlatformUser = mongoose.model('User');

                const roles = await Role.find({ _id: { $in: ids } });

                if (roles.length !== ids.length) {
                    ctx.addIssue({
                        code: 'custom',
                        message: `Нельзя удалить несуществующие роли (найдено ${roles.length} из ${ids.length})`
                    });
                }

                const systemRoles = roles.filter(r => r.isSystem);
                if (systemRoles.length > 0) {
                    const names = systemRoles.map(r => r.name).join(', ');
                    ctx.addIssue({
                        code: 'custom',
                        message: `Нельзя удалить системные роли: ${names}`
                    });
                }

                const usersWithRoles = await PlatformUser.exists({ role: { $in: ids } });
                if (usersWithRoles) {
                    ctx.addIssue({
                        code: 'custom',
                        message: "Одна или несколько ролей из списка назначены пользователям"
                    });
                }
            }))
    })
});

/**
 * Схема получения списка ролей с фильтрацией и пагинацией
 */
const getAllRolesSchema = z.object({
    query: z.object({
        // Поиск по части названия
        search: z.string().trim().optional(),

        // Фильтр: только системные или только пользовательские
        isSystem: z.enum(['true', 'false'])
            .transform(val => val === 'true')
            .optional(),

        // Пагинация (преобразуем строки из URL в числа)
        page: z.string()
            .regex(/^\d+$/, "Номер страницы должен быть числом")
            .transform(Number)
            .default("1"),

        limit: z.string()
            .regex(/^\d+$/, "Лимит должен быть числом")
            .transform(Number)
            .default("10"),
    })
});

const getOneRoleSchema = z.object({
    params: z.object({
        id: objectId
    })
});

module.exports = {
    createRoleSchema,
    updateRoleSchema,
    deleteRoleSchema,
    getOneRoleSchema,
    getAllRolesSchema,
    deleteRoleListSchema
};