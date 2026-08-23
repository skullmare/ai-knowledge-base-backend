const mongoose = require('mongoose');
const { z } = require('zod');

const objectId = z.string()
    .trim()
    .refine(v => mongoose.Types.ObjectId.isValid(v), "Некорректный ID");

const updateMeSchema = z.object({
    userId: objectId,
    body: z.object({
        firstName: z.string().trim().min(1, "Поле имени не может быть пустым").max(50, "Максимальная длинна имени 50 символов").optional(),
        lastName: z.string().trim().min(1, "Поле фамилия не может быть пустой").max(50, "Максимальная длинна фамилии 50 символов").optional(),
        login: z.string().trim().min(3, "Логин должен быть не менее 3 символов")
            .transform(val => val.toLowerCase()).optional(),
        email: z.email("Некорректный формат email")
            .transform(val => val.toLowerCase()).optional(),
        photoUrl: z.url("Некорректная ссылка на фото").optional().or(z.literal('')),
    })
}).superRefine(async (data, ctx) => {
    if (!mongoose.Types.ObjectId.isValid(data.userId)) return;

    const { userId, body } = data;

    const user = await mongoose.model('PlatformUser').findById(userId);
    if (!user) {
        ctx.addIssue({ code: 'custom', path: ['userId'], message: 'Пользователь не найден' });
        return;
    }

    if (body.login && body.login !== user.login) {
        const exists = await mongoose.model('PlatformUser').exists({ 
            login: body.login, 
            _id: { $ne: userId } 
        });
        if (exists) {
            ctx.addIssue({
                code: 'custom',
                path: ['body', 'login'],
                message: 'Этот логин уже занят'
            });
        }
    }

    if (body.email && body.email !== user.email) {
        const exists = await mongoose.model('PlatformUser').exists({ 
            email: body.email, 
            _id: { $ne: userId } 
        });
        if (exists) {
            ctx.addIssue({
                code: 'custom',
                path: ['body', 'email'], 
                message: 'Этот email уже занят'
            });
        }
    }
    data.userInstance = user;
}).transform((data) => ({
    body: data.body,
    userInstance: data.userInstance
}));

module.exports = {
    updateMeSchema
};