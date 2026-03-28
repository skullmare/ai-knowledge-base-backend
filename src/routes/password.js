const express = require('express');
const router = express.Router();

const { 
    changePassword, 
    forgotPassword, 
    resetPassword 
} = require('../controllers/password/export');

const { auth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

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
    validate(forgotPasswordSchema), 
    forgotPassword
);

router.post(
    '/reset/:token', 
    validate(resetPasswordSchema), 
    resetPassword
);

module.exports = router;