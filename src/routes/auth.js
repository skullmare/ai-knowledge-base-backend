const express = require('express');
const router = express.Router();
const { login, refresh, logout, verifyTwoFactor } = require('../controllers/auth/export');
const validate = require('../middlewares/validate');
const { verifyTwoFactorSchema } = require('../schemas/auth');
const rateLimit = require('../middlewares/rateLimit');

router.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: 'Слишком много запросов на авторизацию, попробуйте позже' }), login);
router.post('/verify-2fa', validate(verifyTwoFactorSchema), verifyTwoFactor);
router.post('/refresh', refresh);
router.post('/logout', logout);

module.exports = router;