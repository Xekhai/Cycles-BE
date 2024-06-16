const express = require('express');
const paymentController = require('../controllers/paymentController');
const subscriptionAuth = require('../middlewares/subscriptionAuth');
const apiKeyAuth = require('../middlewares/apiKeyAuth');

const router = express.Router();

router.post('/subscription/generate-url', apiKeyAuth, subscriptionAuth,  paymentController.generateSubscriptionPaymentUrl);
router.post('/one-time/generate-url', apiKeyAuth,  paymentController.generateOneTimePaymentUrl);
router.post('/subscription/confirm', paymentController.confirmPayment);
router.post('/one-time/confirm', paymentController.confirmOneTimePayment);
router.post('/intra-wallet-transfer', apiKeyAuth, paymentController.intraWalletTransfer); // New endpoint for intra-wallet transfer


module.exports = router;
