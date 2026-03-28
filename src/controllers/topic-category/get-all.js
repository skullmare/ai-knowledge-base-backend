const TopicCategory = require('../../models/topic-category');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    const { search, page, limit } = req.validatedData.query;
    try {
        const filter = {};
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        const skip = (page - 1) * limit;

        const [categories, total] = await Promise.all([
            TopicCategory.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            TopicCategory.countDocuments(filter)
        ]);

        return successHandler(res, 200, 'Список категорий получен', {
            categories,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        return errorHandler(res, 500, 'Ошибка сервера при получении списка категорий', [{ path: 'server', message: error.message }]);
    }
};