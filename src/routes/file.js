const express = require('express');
const router = express.Router();
const multer = require('multer');

const fileController = require('../controllers/file/export');

const { auth } = require('../middlewares/auth');

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.post(
    '/upload',
    auth,
    upload.single('file'),
    fileController.uploadFile
);

module.exports = router;