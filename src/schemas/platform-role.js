const mongoose = require('mongoose');
const { z } = require('zod');
const { ALL_PERMISSIONS } = require('../constants/permissions');

const objectId = z.string()
    .trim()
    .refine(v => mongoose.Types.ObjectId.isValid(v), "Некорректный ID");

const roleNameIsUnique = (currentPlatformRoleId = null) => async (name, ctx) => {
    const query = { name: name.trim() };
    if (currentPlatformRoleId) {
        query._id = { $ne: currentPlatformRoleId };
    }

    const exists = await mongoose.model('PlatformRole').exists(query);
    if (exists) {
        ctx.addIssue({
            code: 'custom',
            path: ['name'],
            message: 'Роль с таким названием уже существует'
        });
    }
};

const createPlatformRoleSchema = z.object({
    body: z.object({
        name: z
            .string("Название роли обязательно для заполнения")
            .trim()
            .min(1, "Название роли не может быть пустым")
            .max(50, "Название роли не может быть более 50 символов")
            .superRefine(roleNameIsUnique()),
        permissions: z.array(z.enum(ALL_PERMISSIONS, "Выбрано некорректное разрешение")).min(1, "Список прав не может быть пустым"),
        description: z
            .string("Описание роли обязательно для заполнения")
            .trim()
            .min(1, "Описание роли не может быть пустым")
            .max(1000, "Описание роли не может быть более 1000 символов")
    }),
});

const updatePlatformRoleSchema = z.object({
    params: z.object({
        id: objectId
    }),
    body: z.object({
        name: z.string().trim().min(1).max(100).optional(),
        permissions: z.array(z.enum(ALL_PERMISSIONS)).min(1).optional(),
        description: z.string().trim().min(1).max(1000).optional()
    })
}).pipe(
    z.object({
        params: z.object({ id: z.string() }),
        body: z.object({
            name: z.string().optional(),
            permissions: z.array(z.string()).optional(),
            description: z.string().optional()
        })
    }).superRefine(async (data, ctx) => {
        const role = await mongoose.model('PlatformRole').findById(data.params.id);

        if (!role) {
            ctx.addIssue({ 
                code: 'custom', 
                path: ['params', 'id'], 
                message: 'Роль не найдена' 
            });
            return;
        }

        if (role.isSystem && data.body.permissions) {
            ctx.addIssue({
                code: 'custom',
                path: ['body', 'permissions'],
                message: 'У системной роли нельзя изменять права доступа'
            });
        }

        if (data.body.name) {
            await roleNameIsUnique(data.params.id)(data.body.name, ctx);
        }
    })
);

const deletePlatformRoleSchema = z.object({
    params: z.object({
        id: objectId.pipe(z.string().superRefine(async (id, ctx) => {
            const role = await mongoose.model('PlatformRole').findById(id);

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

            const PlatformUser = mongoose.model('PlatformUser');
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

const deletePlatformRoleListSchema = z.object({
    body: z.object({
        ids: z.array(objectId)
            .min(1, "Список ролей не может быть пустым")
            .pipe(z.array(z.string()).superRefine(async (ids, ctx) => {
                const PlatformRole = mongoose.model('PlatformRole');
                const PlatformUser = mongoose.model('PlatformUser');

                const roles = await PlatformRole.find({ _id: { $in: ids } });

                if (roles.length !== ids.length) {
                    ctx.addIssue({
                        code: 'custom',
                        message: `Нельзя удалить несуществующие роли (найдено ${roles.length} из ${ids.length})`
                    });
                }

                const systemPlatformRoles = roles.filter(r => r.isSystem);
                if (systemPlatformRoles.length > 0) {
                    const names = systemPlatformRoles.map(r => r.name).join(', ');
                    ctx.addIssue({
                        code: 'custom',
                        message: `Нельзя удалить системные роли: ${names}`
                    });
                }

                const usersWithPlatformRoles = await PlatformUser.exists({ role: { $in: ids } });
                if (usersWithPlatformRoles) {
                    ctx.addIssue({
                        code: 'custom',
                        message: "Одна или несколько ролей из списка назначены пользователям"
                    });
                }
            }))
    })
});

const getAllPlatformRolesSchema = z.object({
    query: z.object({
        search: z.string().trim().optional(),
        isSystem: z.enum(['true', 'false'])
            .transform(val => val === 'true')
            .optional()
    })
});

const getOnePlatformRoleSchema = z.object({
    params: z.object({
        id: objectId
    })
});

module.exports = {
    createPlatformRoleSchema,
    updatePlatformRoleSchema,
    deletePlatformRoleSchema,
    getOnePlatformRoleSchema,
    getAllPlatformRolesSchema,
    deletePlatformRoleListSchema
};