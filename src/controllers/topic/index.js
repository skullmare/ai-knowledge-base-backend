const createTopic = require('./topicCreate.controller');
const { getAll, getOne } = require('./topicGet.controller');
const updateTopic = require('./topicUpdate.controller');
const approveTopic = require('./topicApprove.controller');
const deleteTopic = require('./topicDelete.controller');

module.exports = {
    createTopic,
    getTopics: getAll,
    getTopicById: getOne,
    updateTopic,
    approveTopic,
    deleteTopic
};