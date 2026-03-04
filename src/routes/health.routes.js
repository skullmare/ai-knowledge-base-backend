const router = require('express').Router();
const { health } = require('../controllers/health.controller');

router.get('/', health);

module.exports = router;