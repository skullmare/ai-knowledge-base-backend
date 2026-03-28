const express = require('express');
const router = express.Router();

const logsControllers = require('../controllers/log/export');
const { getLogsSchema, getLogSchema } = require('../schemas/log');
const { auth } = require('../middlewares/auth');
const checkPermission = require('../middlewares/permission');
const validate = require('../middlewares/validate');

router.get(
    '/',
    auth,
    checkPermission('logs.read'),
    validate(getLogsSchema),
    logsControllers.getAllLogs
);

router.get(
    '/:id',
    auth,
    checkPermission('logs.read'),
    validate(getLogSchema),
    logsControllers.getOneLog
);

module.exports = router;