const express = require('express');
const router = express.Router();
const { login, refresh, logout } = require('../controllers/auth/export');
const rateLimit = require('../middlewares/rateLimit');

router.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Слишком много попыток входа с {ip}, попробуйте позже' }), login);
router.post('/refresh', refresh);
router.post('/logout', logout);

module.exports = router;