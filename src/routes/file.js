const express = require('express');
const router = express.Router();

const fileController = require('../controllers/file/export');

const { auth } = require('../middlewares/auth');
const checkPermission = require('../middlewares/permission');
const validate = require('../middlewares/validate');

const {
    createMultipartSchema,
    signMultipartSchema,
    completeMultipartSchema,
    abortMultipartSchema,
    getFilesSchema,
    createFileSchema,
    importGoogleFileSchema,
    updateFileSchema,
    fileIdSchema,
    getFileLinkSchema,
} = require('../schemas/file');

// ── Загрузка напрямую в S3 (multipart presigned URL) ────────────────────────
// Тело файла через бэкенд не проходит: сервер только подписывает запросы.

router.post(
    '/multipart/create',
    auth,
    checkPermission('files.upload'),
    validate(createMultipartSchema),
    fileController.multipart.create
);

router.post(
    '/multipart/sign',
    auth,
    checkPermission('files.upload'),
    validate(signMultipartSchema),
    fileController.multipart.sign
);

router.post(
    '/multipart/complete',
    auth,
    checkPermission('files.upload'),
    validate(completeMultipartSchema),
    fileController.multipart.complete
);

router.post(
    '/multipart/abort',
    auth,
    checkPermission('files.upload'),
    validate(abortMultipartSchema),
    fileController.multipart.abort
);

// ── Файлы базы знаний ───────────────────────────────────────────────────────

router.get(
    '/',
    auth,
    checkPermission('files.read'),
    validate(getFilesSchema),
    fileController.getAll
);

router.post(
    '/',
    auth,
    checkPermission('files.upload'),
    validate(createFileSchema),
    fileController.createFile
);

router.post(
    '/google-drive',
    auth,
    checkPermission('googleDrive.import'),
    validate(importGoogleFileSchema),
    fileController.importGoogleDriveFile
);

router.get(
    '/:id/link',
    auth,
    checkPermission('files.read'),
    validate(getFileLinkSchema),
    fileController.getLink
);

router.post(
    '/:id/vectorize',
    auth,
    checkPermission('files.vectorize'),
    validate(fileIdSchema),
    fileController.vectorize
);

router.post(
    '/:id/devectorize',
    auth,
    checkPermission('files.vectorize'),
    validate(fileIdSchema),
    fileController.devectorize
);

router.patch(
    '/:id',
    auth,
    checkPermission('files.update'),
    validate(updateFileSchema),
    fileController.updateFile
);

router.delete(
    '/:id',
    auth,
    checkPermission('files.delete'),
    validate(fileIdSchema),
    fileController.deleteFile
);

module.exports = router;
