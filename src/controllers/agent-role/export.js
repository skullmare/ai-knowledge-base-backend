const createAgentRole = require('./create');
const updateAgentRole = require('./update');
const deleteAgentRole = require('./delete');
const deleteAgentRoleList = require('./delete-list');
const getAllAgentRoles = require('./get-all');
const getOneAgentRole = require('./get-one');

module.exports = {
    createAgentRole,
    updateAgentRole,
    deleteAgentRole,
    deleteAgentRoleList,
    getAllAgentRoles,
    getOneAgentRole
};