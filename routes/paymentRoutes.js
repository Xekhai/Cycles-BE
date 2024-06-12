const express = require('express');
const paymentController = require('../controllers/paymentController');
const subscriptionAuth = require('../middlewares/subscriptionAuth');

const router = express.Router();

router.post('/generate-url', subscriptionAuth, paymentController.generatePaymentUrl);
router.post('/confirm', paymentController.confirmPayment); // Exempt this endpoint

module.exports = router;
