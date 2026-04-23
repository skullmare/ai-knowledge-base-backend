const login = require('./login');
const refresh = require('./refresh');
const logout = require('./logout');
const verifyTwoFactor = require('./verify-two-factor');

module.exports = {
    login,
    refresh,
    logout,
    verifyTwoFactor
};