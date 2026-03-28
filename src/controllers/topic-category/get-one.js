const TopicCategory = require('../../models/topic-category');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    const { id } = req.validatedData.params;

    try {
        const category = await TopicCategory.findById(id);

        if (!category) {
            return errorHandler(res, 404, 'Категория не найдена');
        }

        return successHandler(res, 200, 'Категория получена', category);

    } catch (error) {
        return errorHandler(res, 500, 'Ошибка сервера при получении категории', [{ path: 'server', message: error.message }]);
    }
};