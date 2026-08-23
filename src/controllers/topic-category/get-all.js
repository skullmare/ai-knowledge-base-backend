const TopicCategory = require('../../models/topic-category');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    const { search } = req.validatedData.query;
    try {
        const filter = {};
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        const categories = await TopicCategory.find(filter).sort({ createdAt: -1 });

        return successHandler(res, 200, 'Список категорий получен', {
            categories
        });

    } catch (error) {
        return errorHandler(res, 500, 'Ошибка сервера при получении списка категорий', [{ path: 'server', message: error.message }]);
    }
};