const router = require('express').Router();
const { health } = require('../controllers/health');

router.get('/', health);

module.exports = router;