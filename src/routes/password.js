const express = require('express');
const router = express.Router();

const { 
    changePassword, 
    forgotPassword, 
    resetPassword 
} = require('../controllers/password/export');

const { auth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const rateLimit = require('../middlewares/rateLimit');

const { 
    changePasswordSchema, 
    forgotPasswordSchema, 
    resetPasswordSchema 
} = require('../schemas/password');

router.put(
    '/change', 
    auth, 
    validate(changePasswordSchema), 
    changePassword
);

router.post(
    '/forgot',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 5, messageTemplate: 'Слишком много запросов на сброс пароля, попробуйте позже' }),
    validate(forgotPasswordSchema),
    forgotPassword
);

router.post(
    '/reset/:token', 
    validate(resetPasswordSchema), 
    resetPassword
);

module.exports = router;