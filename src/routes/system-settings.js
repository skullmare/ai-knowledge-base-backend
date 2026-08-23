const express = require('express');
const router = express.Router();

const settingsController = require('../controllers/system-settings/export');

const { auth } = require('../middlewares/auth');
const checkPermission = require('../middlewares/permission');
const validate = require('../middlewares/validate');

const { updateSettingsSchema, testConnectionSchema } = require('../schemas/system-settings');

router.get(
    '/',
    auth,
    checkPermission('system_settings.read'),
    settingsController.getAllSettings
);

// Право на конкретную группу проверяется в контроллере — здесь только доступ
// к разделу настроек как таковому
router.patch(
    '/',
    auth,
    checkPermission('system_settings.read'),
    validate(updateSettingsSchema),
    settingsController.updateSettings
);

router.get(
    '/ai/models',
    auth,
    checkPermission('system_settings.read'),
    settingsController.getModels
);

router.post(
    '/ai/test',
    auth,
    checkPermission('system_settings.ai_provider'),
    validate(testConnectionSchema),
    settingsController.testConnection
);

// Пересоздание коллекции нужно после смены модели эмбеддингов:
// у новой модели другая размерность вектора
router.post(
    '/qdrant/recreate',
    auth,
    checkPermission('system_settings.ai_provider'),
    settingsController.recreateCollection
);

module.exports = router;
