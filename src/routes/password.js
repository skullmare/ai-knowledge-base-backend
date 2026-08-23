const express = require('express');
const router = express.Router();

const { changePassword, forgotPassword, resetPassword } = require('../controllers/password/export');
const { auth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const createRateLimit = require('../middlewares/rateLimit');
const { changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } = require('../schemas/password');

const recoveryLimiter = createRateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    messageTemplate: 'Слишком много запросов на восстановление пароля, попробуйте позже'
});

router.put('/change', auth, validate(changePasswordSchema), changePassword);
router.post('/forgot', recoveryLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset/:token', recoveryLimiter, validate(resetPasswordSchema), resetPassword);

module.exports = router;
