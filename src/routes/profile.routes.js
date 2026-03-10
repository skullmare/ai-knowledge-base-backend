const express = require('express');
const router = express.Router();
const { me, updateMe} = require('../controllers/profile/index');
const { auth } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { updateMeSchema } = require('../schemas/profile.schema');

router.get('/', auth, me);
router.patch('/update', auth, validate(updateMeSchema), updateMe);

module.exports = router;