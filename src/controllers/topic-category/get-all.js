const TopicCategory = require('../../models/topic-category');
const { searchRegex } = require('../../utils/query-helpers');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    const { search } = req.validatedData.query;
    try {
        const filter = {};
        if (search) filter.name = searchRegex(search);

        const categories = await TopicCategory.find(filter).sort({ createdAt: -1 }).lean();

        return successHandler(res, 200, 'Список категорий получен', categories);

    } catch (error) {
        return errorHandler(res, 500, 'Ошибка сервера при получении списка категорий', [{ path: 'server', message: error.message }]);
    }
};