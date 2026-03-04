const express = require('express');
const router = express.Router();
const { login, refresh, me } = require('../controllers/auth/auth.controller');
const { auth } = require('../middlewares/auth.middleware');

// Публичные роуты
// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// Защищенный роут (для проверки работы авторизации)
// GET /api/auth/me
router.get('/me', auth, me);

module.exports = router;