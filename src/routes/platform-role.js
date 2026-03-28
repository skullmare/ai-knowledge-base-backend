const express = require('express');
const router = express.Router();

const roleController = require('../controllers/platform-role/export');

const { auth } = require('../middlewares/auth');
const checkPermission = require('../middlewares/permission');
const validate = require('../middlewares/validate');

const { getAllPlatformRolesSchema, getOnePlatformRoleSchema, deletePlatformRoleListSchema, deletePlatformRoleSchema, updatePlatformRoleSchema, createPlatformRoleSchema } = require('../schemas/platform-role')

router.get(
    '/',
    auth,
    checkPermission('role.read'),
    validate(getAllPlatformRolesSchema),
    roleController.getAllRoles
);

router.get(
    '/:id',
    auth,
    checkPermission('role.read'),
    validate(getOnePlatformRoleSchema),
    roleController.getOneRole
);

router.post(
    '/',
    auth,
    checkPermission('role.create'),
    validate(createPlatformRoleSchema),
    roleController.createRole
);

router.patch(
    '/:id',
    auth,
    checkPermission('role.update'),
    validate(updatePlatformRoleSchema),
    roleController.updateRole
);

router.delete(
    '/delete/many',
    auth,
    checkPermission('role.delete'),
    validate(deletePlatformRoleListSchema),
    roleController.deleteRoleList
);

router.delete(
    '/:id',
    auth,
    checkPermission('role.delete'),
    validate(deletePlatformRoleSchema),
    roleController.deleteRole
);

module.exports = router;