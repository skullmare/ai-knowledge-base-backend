const express = require('express');
const router = express.Router();
const planfixAuth = require('../middlewares/planfix-auth');
const createContact = require('../controllers/planfix-contact/create');
const updateContact = require('../controllers/planfix-contact/update');
const deleteContact = require('../controllers/planfix-contact/delete');

router.post('/', planfixAuth, createContact);
router.put('/:id', planfixAuth, updateContact);
router.delete('/:id', planfixAuth, deleteContact);

module.exports = router;
