const getAllSettings = require('./get-all');
const updateSettingsController = require('./update');
const getModels = require('./get-models');
const testConnection = require('./test-connection');

module.exports = {
    getAllSettings,
    updateSettings: updateSettingsController,
    getModels,
    testConnection,
};
