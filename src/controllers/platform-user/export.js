const createUser = require('./create');
const getAllUsers = require('./get-all');
const getOneUser = require('./get-one');
const updateUser = require('./update');
const deleteUser = require('./delete');

module.exports = {
    createUser,
    getAllUsers,
    getOneUser,
    updateUser,
    deleteUser
};