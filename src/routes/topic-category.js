const express = require('express');
const router = express.Router();

const topicCategoryController = require('../controllers/topic-category/export');

const { auth } = require('../middlewares/auth');
const checkPermission = require('../middlewares/permission');

const validate = require('../middlewares/validate');
const { 
    createCategorySchema,
    updateCategorySchema,
    deleteCategorySchema,
    deleteCategoryListSchema,
    getOneCategorySchema,
    getAllCategoriesSchema
 } = require('../schemas/topic-category');

router.get(
    '/',
    auth,
    checkPermission('topicCategories.read'),
    validate(getAllCategoriesSchema),
    topicCategoryController.getAllCategories
);

router.get(
    '/:id',
    auth,
    checkPermission('topicCategories.read'),
    validate(getOneCategorySchema),
    topicCategoryController.getOneCategory
);

router.post(
    '/',
    auth,
    checkPermission('topicCategories.create'),
    validate(createCategorySchema),
    topicCategoryController.createCategory
);

router.patch(
    '/:id',
    auth,
    checkPermission('topicCategories.update'),
    validate(updateCategorySchema),
    topicCategoryController.updateCategory
);

router.delete(
    '/delete/many',
    auth,
    checkPermission('topicCategories.delete'),
    validate(deleteCategoryListSchema),
    topicCategoryController.deleteCategoryList
);

router.delete(
    '/:id',
    auth,
    checkPermission('topicCategories.delete'),
    validate(deleteCategorySchema),
    topicCategoryController.deleteCategory
);

module.exports = router;