const express = require('express');
const router = express.Router();

const googleDriveController = require('../controllers/google-drive/export');

const { auth } = require('../middlewares/auth');
const checkPermission = require('../middlewares/permission');
const validate = require('../middlewares/validate');

const { connectGoogleDriveSchema, listGoogleDriveFilesSchema } = require('../schemas/google-drive');

router.get(
    '/status',
    auth,
    checkPermission('googleDrive.read'),
    googleDriveController.getStatus
);

router.get(
    '/auth-url',
    auth,
    checkPermission('system_settings.google_drive'),
    googleDriveController.getAuthUrl
);

router.post(
    '/connect',
    auth,
    checkPermission('system_settings.google_drive'),
    validate(connectGoogleDriveSchema),
    googleDriveController.connect
);

router.post(
    '/disconnect',
    auth,
    checkPermission('system_settings.google_drive'),
    googleDriveController.disconnect
);

router.get(
    '/files',
    auth,
    checkPermission('googleDrive.read'),
    validate(listGoogleDriveFilesSchema),
    googleDriveController.listFiles
);

module.exports = router;
