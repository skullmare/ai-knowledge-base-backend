const express = require('express');
const router = express.Router();

const agentRoleController = require('../controllers/agent-role/export');

const { auth } = require('../middlewares/auth');
const checkPermission = require('../middlewares/permission');
const validate = require('../middlewares/validate');

const { 
    getAllAgentRolesSchema, 
    getOneAgentRoleSchema, 
    deleteAgentRoleListSchema, 
    deleteAgentRoleSchema, 
    updateAgentRoleSchema, 
    createAgentRoleSchema 
} = require('../schemas/agent-role');

router.get(
    '/',
    auth,
    checkPermission('agentRoles.read'),
    validate(getAllAgentRolesSchema),
    agentRoleController.getAllAgentRoles
);

router.get(
    '/:id',
    auth,
    checkPermission('agentRoles.read'),
    validate(getOneAgentRoleSchema),
    agentRoleController.getOneAgentRole
);

router.post(
    '/',
    auth,
    checkPermission('agentRoles.create'),
    validate(createAgentRoleSchema),
    agentRoleController.createAgentRole
);

router.patch(
    '/:id',
    auth,
    checkPermission('agentRoles.update'),
    validate(updateAgentRoleSchema),
    agentRoleController.updateAgentRole
);

router.delete(
    '/delete/many',
    auth,
    checkPermission('agentRoles.delete'),
    validate(deleteAgentRoleListSchema),
    agentRoleController.deleteAgentRoleList
);

router.delete(
    '/:id',
    auth,
    checkPermission('agentRoles.delete'),
    validate(deleteAgentRoleSchema),
    agentRoleController.deleteAgentRole
);

module.exports = router;