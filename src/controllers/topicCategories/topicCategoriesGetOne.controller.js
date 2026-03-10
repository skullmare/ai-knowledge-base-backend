const TopicCategory = require('../../models/topicCategory');
const successHandler = require('../../utils/successHandler');
const errorHandler = require('../../utils/errorHandler');

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