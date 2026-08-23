const mongoose = require('mongoose');
const { z } = require('zod');

const objectId = z.string()
    .trim()
    .refine(v => mongoose.Types.ObjectId.isValid(v), "Некорректный ID категории");

const categoryNameIsUnique = (currentCategoryId = null) => async (name, ctx) => {
    const query = { name: name.trim() };
    if (currentCategoryId) {
        query._id = { $ne: currentCategoryId };
    }

    const exists = await mongoose.model('TopicCategory').exists(query);
    if (exists) {
        ctx.addIssue({
            code: 'custom',
            path: ['name'],
            message: 'Категория с таким названием уже существует'
        });
    }
};

const createCategorySchema = z.object({
    body: z.object({
        name: z.string("Название обязательно")
            .trim()
            .min(1, "Название не может быть пустым")
            .max(50, "Максимальная длина названия 50 символов")
            .superRefine(categoryNameIsUnique()),
        description: z.string("Описание обязательно")
            .trim()
            .min(1, "Описание не может быть пустым")
            .max(300, "Максимальная длина описания 300 символов")
    })
});

const updateCategorySchema = z.object({
    params: z.object({
        id: objectId
    }),
    body: z.object({
        name: z.string().trim().min(1, "Название не может быть пустым").max(50, "Максимальная длина названия 50 символов").optional(),
        description: z.string().trim().min(1, "Описание не может быть пустым").max(300, "Максимальная длина описания 300 символов").optional()
    })
}).superRefine(async (data, ctx) => {
    if (!mongoose.Types.ObjectId.isValid(data.params.id)) return;
    const category = await mongoose.model('TopicCategory').findById(data.params.id);
    if (!category) {
        ctx.addIssue({ code: 'custom', path: ['params', 'id'], message: 'Категория не найдена' });
        return;
    }

    if (data.body.name) {
        await categoryNameIsUnique(data.params.id)(data.body.name, ctx);
    }
});

const deleteCategorySchema = z.object({
    params: z.object({
        id: objectId
    })
}).superRefine(async (data, ctx) => {
    if (!mongoose.Types.ObjectId.isValid(data.params.id)) return;
    const category = await mongoose.model('TopicCategory').findById(data.params.id);
    
    if (!category) {
        ctx.addIssue({ code: 'custom', path: ['params', 'id'], message: 'Категория не найдена' });
        return;
    }

    const Topic = mongoose.model('Topic');
    const count = await Topic.countDocuments({ 'metadata.category': data.params.id });

    if (count > 0) {
        ctx.addIssue({
            code: 'custom',
            path: ['params', 'id'],
            message: `Нельзя удалить категорию "${category.name}", так как она используется в топиках (${count} шт.)`
        });
    }
});

const deleteCategoryListSchema = z.object({
    body: z.object({
        ids: z.array(objectId)
            .min(1, "Список ID не может быть пустым")
            .pipe(z.array(z.string()).superRefine(async (ids, ctx) => {
                const TopicCategory = mongoose.model('TopicCategory');
                const Topic = mongoose.model('Topic');

                const foundCategories = await TopicCategory.find({ _id: { $in: ids } });
                if (foundCategories.length !== ids.length) {
                    ctx.addIssue({
                        code: 'custom',
                        path: ['ids'],
                        message: "Одна или несколько категорий не найдены"
                    });
                    return;
                }

                const usedInTopic = await Topic.exists({ 'metadata.category': { $in: ids } });
                if (usedInTopic) {
                    ctx.addIssue({
                        code: 'custom',
                        path: ['ids'],
                        message: "Нельзя удалить выбранные категории: одна или несколько из них используются в топиках"
                    });
                }
            }))
    })
});

const getAllCategoriesSchema = z.object({
    query: z.object({
        search: z.string().trim().optional()
    })
});

const getOneCategorySchema = z.object({
    params: z.object({
        id: objectId
    })
});

module.exports = {
    createCategorySchema,
    updateCategorySchema,
    deleteCategorySchema,
    deleteCategoryListSchema,
    getOneCategorySchema,
    getAllCategoriesSchema
};