const createTopic = require('./create');
const getAll = require('./get-all');
const getOne = require('./get-one');
const updateTopic = require('./update');
const approveTopic = require('./approve');
const deleteTopic = require('./delete');

module.exports = {
    createTopic,
    getAll,
    getOne,
    updateTopic,
    approveTopic,
    deleteTopic
};