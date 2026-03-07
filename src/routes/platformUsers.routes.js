const express = require('express');
const router = express.Router();
const multer = require('multer');

// Импортируем фасад контроллеров пользователей
const userController = require('../controllers/platformUser/index');

// Middleware
const { auth } = require('../middlewares/auth.middleware');
const checkPermission = require('../middlewares/permission.middleware');

// Конфигурация Multer для аватарок
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // Ограничение 5MB для фото
});

/**
 * 1. Получение списка всех сотрудников
 * Права: platformUsers.read
 */
router.get(
    '/',
    auth,
    checkPermission('platformUsers.read'),
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
    upload.single('photoUrl'), // Принимаем один файл (аватар)
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
    upload.single('photo'), // Позволяем обновить фото
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
    userController.deleteUser
);

module.exports = router;