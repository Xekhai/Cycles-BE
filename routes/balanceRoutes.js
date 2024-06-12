const express = require('express');
const router = express.Router();
const balanceController = require('../controllers/balanceController');

router.post('/update', balanceController.updateBalance);

module.exports = router;
