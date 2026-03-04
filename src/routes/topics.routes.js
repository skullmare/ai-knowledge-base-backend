const express = require('express');
const router = express.Router();
const multer = require('multer');

// Импортируем наш "фасад" контроллеров
const topicsController = require('../controllers/topic/index');

// Middleware
const { auth } = require('../middlewares/auth.middleware');
const checkPermission = require('../middlewares/permission.middleware');

// Конфигурация Multer (память для быстрой пересылки в S3)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // Ограничение 10MB на файл
});

/**
 * 1. Получение списка тем
 * Права: topics.read
 */
router.get(
    '/',
    auth,
    checkPermission('topics.read'),
    topicsController.getTopics
);

/**
 * 2. Получение конкретной темы
 * Права: topics.read
 */
router.get(
    '/:id',
    auth,
    checkPermission('topics.read'),
    topicsController.getTopicById
);

/**
 * 3. Создание новой темы (Статус: review)
 * Права: topics.create
 */
router.post(
    '/',
    auth,
    checkPermission('topics.create'),
    upload.array('files'), // Принимаем бинарники
    topicsController.createTopic
);

/**
 * 4. Частичное обновление темы
 * При изменении name/content статус сбрасывается на review
 * Права: topics.update
 */
router.patch(
    '/:id',
    auth,
    checkPermission('topics.update'),
    upload.array('files'), // Позволяем добавлять файлы при патче
    topicsController.updateTopic
);

/**
 * 5. Одобрение темы (Векторизация и Qdrant)
 * Права: topics.approve
 */
router.post(
    '/:id/approve',
    auth,
    checkPermission('topics.approve'),
    topicsController.approveTopic
);

/**
 * 6. Полное удаление (БД + S3 + Qdrant)
 * Права: topics.delete
 */
router.delete(
    '/:id',
    auth,
    checkPermission('topics.delete'),
    topicsController.deleteTopic
);

module.exports = router;