const os = require('os');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const router = express.Router();

const fileController = require('../controllers/file/export');
const { auth } = require('../middlewares/auth');
const checkPermission = require('../middlewares/permission');
const validate = require('../middlewares/validate');
const { presignedUrlSchema, confirmUploadSchema } = require('../schemas/file');

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const upload = multer({
    storage: multer.diskStorage({
        destination: os.tmpdir(),
        filename: (req, file, cb) => cb(null, `upload-${crypto.randomUUID()}`)
    }),
    limits: { fileSize: MAX_FILE_SIZE, files: 1 }
});

router.post(
    '/upload',
    auth,
    checkPermission('files.upload'),
    upload.single('file'),
    fileController.uploadFile
);

router.post(
    '/presigned-url',
    auth,
    checkPermission('files.upload'),
    validate(presignedUrlSchema),
    fileController.getPresignedUrl
);

router.post(
    '/presigned-complete',
    auth,
    checkPermission('files.upload'),
    validate(confirmUploadSchema),
    fileController.confirmUpload
);

module.exports = router;
