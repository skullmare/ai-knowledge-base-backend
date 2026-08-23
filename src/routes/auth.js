const express = require('express');
const router = express.Router();

const { login, refresh, logout, verifyTwoFactor } = require('../controllers/auth/export');
const validate = require('../middlewares/validate');
const createRateLimit = require('../middlewares/rateLimit');
const { loginSchema, verifyTwoFactorSchema } = require('../schemas/auth');

const loginLimiter = createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    messageTemplate: 'Слишком много попыток входа, попробуйте позже'
});

const refreshLimiter = createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    messageTemplate: 'Слишком много запросов на обновление сессии'
});

router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/verify-2fa', loginLimiter, validate(verifyTwoFactorSchema), verifyTwoFactor);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);

module.exports = router;
