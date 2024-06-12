const express = require('express');
const router = express.Router();
const { walletController, withdrawalController} = require('../controllers/walletController');

router.post('/create', walletController.createWallet);
router.post('/otp', withdrawalController.generateOTP);
router.post('/withdraw', walletController.withdraw);

module.exports = router;
