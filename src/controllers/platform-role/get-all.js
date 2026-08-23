const PlatformRole = require('../../models/platform-role');
const { searchRegex } = require('../../utils/query-helpers');
const successHandler = require('../../utils/success-handler');
const errorHandler = require('../../utils/error-handler');

module.exports = async (req, res) => {
    const { search, isSystem } = req.validatedData.query;

    try {
        const filter = {};
        if (search) filter.name = searchRegex(search);
        if (typeof isSystem === 'boolean') {
            filter.isSystem = isSystem;
        }

        const roles = await PlatformRole.find(filter).sort({ name: 1 });

        return successHandler(res, 200, 'Список ролей получен', roles);

    } catch (error) {
        return errorHandler(res, 500, 'Ошибка сервера при получении ролей', [{ path: 'server', message: error.message }]);
    }
};