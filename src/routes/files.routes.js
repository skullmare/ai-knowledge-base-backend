const express = require('express');
const router = express.Router();
const multer = require('multer');

// Импортируем наш "фасад" контроллеров
const fileController = require('../controllers/files/index');

// Middleware
const { auth } = require('../middlewares/auth.middleware');
const checkPermission = require('../middlewares/permission.middleware');

// Конфигурация Multer (память для быстрой пересылки в S3)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // Ограничение 10MB на файл
});

router.post(
    '/upload',
    auth,
    checkPermission('files.upload'),
    upload.single('file'),
    fileController.uploadFile
);

module.exports = router;