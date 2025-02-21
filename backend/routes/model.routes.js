const express = require('express');
const router = express.Router();
const modelController = require('../controllers/model.controller');

router.get('/discover', modelController.discoverModels);

module.exports = router; 