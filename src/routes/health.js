const router = require('express').Router();
const { health, services } = require('../controllers/health');
const { auth } = require('../middlewares/auth');

router.get('/', health);

// Диагностика внешних сервисов — под авторизацией, чтобы не светить
// состояние инфраструктуры наружу
router.get('/services', auth, services);

module.exports = router;
