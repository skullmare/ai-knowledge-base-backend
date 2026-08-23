const getAllSettings = require('./get-all');
const updateSettingsController = require('./update');
const getModels = require('./get-models');
const testConnection = require('./test-connection');
const recreateCollection = require('./recreate-collection');

module.exports = {
    getAllSettings,
    updateSettings: updateSettingsController,
    getModels,
    testConnection,
    recreateCollection,
};
