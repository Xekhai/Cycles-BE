const express = require('express');
const paymentController = require('../controllers/paymentController');
const subscriptionAuth = require('../middlewares/subscriptionAuth');
const apiKeyAuth = require('../middlewares/apiKeyAuth');

const router = express.Router();

router.post('/generate-url', apiKeyAuth, subscriptionAuth, paymentController.generatePaymentUrl);
router.post('/confirm', paymentController.confirmPayment); // Exempt this endpoint

module.exports = router;
