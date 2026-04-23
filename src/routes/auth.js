const express = require('express');
const router = express.Router();
const { login, refresh, logout, verifyTwoFactor } = require('../controllers/auth/export');
const validate = require('../middlewares/validate');
const { verifyTwoFactorSchema } = require('../schemas/auth');

router.post('/login', login);
router.post('/verify-2fa', validate(verifyTwoFactorSchema), verifyTwoFactor);
router.post('/refresh', refresh);
router.post('/logout', logout);

module.exports = router;