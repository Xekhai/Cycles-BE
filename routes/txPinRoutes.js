const express = require('express');
const router = express.Router();
const txPinController = require('../controllers/txPinController');

router.post('/change', txPinController.changeTxPin);

module.exports = router;
