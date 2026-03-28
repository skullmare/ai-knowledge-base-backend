const createCategory = require('./create');
const updateCategory = require('./update');
const deleteCategory = require('./delete');
const deleteCategoryList = require('./delete-list');
const getAllCategories = require('./get-all');
const getOneCategory = require('./get-one');

module.exports = {
    createCategory,
    updateCategory,
    deleteCategory,
    deleteCategoryList,
    getAllCategories,
    getOneCategory
};