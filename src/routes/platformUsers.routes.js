const express = require('express');
const router = express.Router();

// Импортируем фасад контроллеров пользователей
const userController = require('../controllers/platformUser/index');

// Middleware
const { auth } = require('../middlewares/auth.middleware');
const checkPermission = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');

// Schemas
const { getAllUsersSchema, getOneUserSchema, deleteUserSchema, createUserSchema, updateUserSchema} = require('../schemas/user.schema')

/**
 * 1. Получение списка всех сотрудников
 * Права: platformUsers.read
 */
router.get(
    '/',
    auth,
    checkPermission('platformUsers.read'),
    validate(getAllUsersSchema),
    userController.getAllUsers
);

/**
 * 2. Получение данных конкретного сотрудника
 * Права: platformUsers.read
 */
router.get(
    '/:id',
    auth,
    checkPermission('platformUsers.read'),
    validate(getOneUserSchema),
    userController.getOneUser
);

/**
 * 3. Добавление нового сотрудника
 * Права: platformUsers.create
 */
router.post(
    '/',
    auth,
    checkPermission('platformUsers.create'),
    validate(createUserSchema),
    userController.createUser
);

/**
 * 4. Редактирование данных сотрудника
 * Права: platformUsers.update
 */
router.patch(
    '/:id',
    auth,
    checkPermission('platformUsers.update'),
    validate(updateUserSchema),
    userController.updateUser
);

/**
 * 5. Удаление сотрудника из системы
 * Права: platformUsers.delete
 */
router.delete(
    '/:id',
    auth,
    checkPermission('platformUsers.delete'),
    validate(deleteUserSchema),
    userController.deleteUser
);

module.exports = router;