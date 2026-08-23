const multipart = require('./multipart');
const getAll = require('./get-all');
const createFile = require('./create');
const updateFile = require('./update');
const deleteFile = require('./delete');
const { vectorize, devectorize } = require('./vectorize');
const getLink = require('./get-link');
const importGoogleDriveFile = require('./import-google-drive');

module.exports = {
    multipart,
    getAll,
    createFile,
    updateFile,
    deleteFile,
    vectorize,
    devectorize,
    getLink,
    importGoogleDriveFile,
};
