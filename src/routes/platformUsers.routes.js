const router = require('express').Router();
const userController = require('../controllers/platformUser/getUsers.controller');
const { auth } = require('../middlewares/auth.middleware');
const checkPermission = require('../middlewares/permission.middleware');

// Сначала проверяем, что юзер залогинен (auth), 
// потом — есть ли у него право (checkPermission)
router.get(
    '/list',
    auth,
    checkPermission('platformUsers.read'),
    userController.getUsers
);

module.exports = router;