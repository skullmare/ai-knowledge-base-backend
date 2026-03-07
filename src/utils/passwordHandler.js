const bcrypt = require('bcryptjs');

/**
 * Хеширование пароля
 * @param {String} password - Открытый текст пароля
 * @returns {Promise<String>} Хешированный пароль
 */
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

/**
 * Сравнение пароля с хешем
 * @param {String} password - Открытый текст пароля
 * @param {String} hashedPassword - Хеш из базы данных
 * @returns {Promise<Boolean>} Результат проверки
 */
const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

module.exports = {
    hashPassword,
    comparePassword
};