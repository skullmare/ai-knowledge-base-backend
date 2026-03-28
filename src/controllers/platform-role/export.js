const createRole = require('./create');
const updateRole = require('./update');
const deleteRole = require('./delete');
const deleteRoleList = require('./delete-list');
const getAllRoles = require('./get-all');
const getOneRole = require('./get-one');

module.exports = {
    createRole,
    updateRole,
    deleteRole,
    deleteRoleList,
    getAllRoles,
    getOneRole
};