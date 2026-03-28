const express = require('express');
const router = express.Router();

const topicsController = require('../controllers/topic/export');

const { auth } = require('../middlewares/auth');
const checkPermission = require('../middlewares/permission');
const validate = require('../middlewares/validate');

const { 
    createTopicSchema, 
    patchTopicSchema, 
    getTopicsSchema,
    getOneTopicSchema,
    deleteTopicSchema 
} = require('../schemas/topic');

router.get(
    '/',
    auth,
    checkPermission('topics.read'),
    validate(getTopicsSchema),
    topicsController.getAll
);

router.get(
    '/:id',
    auth,
    checkPermission('topics.read'),
    validate(getOneTopicSchema),
    topicsController.getOne
);

router.post(
    '/',
    auth,
    checkPermission('topics.create'),
    validate(createTopicSchema),
    topicsController.createTopic
);

router.patch(
    '/:id',
    auth,
    checkPermission('topics.update'),
    validate(patchTopicSchema),
    topicsController.updateTopic
);

router.post(
    '/:id/approve',
    auth,
    checkPermission('topics.approve'),
    validate(getOneTopicSchema),
    topicsController.approveTopic
);

router.delete(
    '/:id',
    auth,
    checkPermission('topics.delete'),
    validate(deleteTopicSchema),
    topicsController.deleteTopic
);

module.exports = router;