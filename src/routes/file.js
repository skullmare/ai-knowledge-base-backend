const express = require('express');
const router = express.Router();
const multer = require('multer');

const fileController = require('../controllers/file/export');

const { auth } = require('../middlewares/auth');

const os = require('os');

const upload = multer({
    storage: multer.diskStorage({
        destination: os.tmpdir(),
        filename: (req, file, cb) => cb(null, `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    }),
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.post(
    '/upload',
    auth,
    upload.single('file'),
    fileController.uploadFile
);

module.exports = router;