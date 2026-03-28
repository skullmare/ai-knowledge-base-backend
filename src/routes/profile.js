const express = require('express');
const router = express.Router();
const { me, updateMe} = require('../controllers/profile/export');
const { auth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { updateMeSchema } = require('../schemas/profile');

router.get('/', auth, me);
router.patch('/update', auth, validate(updateMeSchema), updateMe);

module.exports = router;