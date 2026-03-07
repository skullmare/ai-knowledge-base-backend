const createUser = require('./createUser.controller');
const getAllUsers = require('./getAllUsers.controller');
const getOneUser = require('./getOneUser.controller');
const updateUser = require('./updateUser.controller');
const deleteUser = require('./deleteUser.controller');

module.exports = {
    createUser,
    getAllUsers,
    getOneUser,
    updateUser,
    deleteUser
};