const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');
const apiKeyAuth = require('../middlewares/apiKeyAuth');
const { checkProductOwnership } = require('../middlewares/checkOwnership');
const subscriptionAuth = require('../middlewares/subscriptionAuth');

const router = express.Router();

router.get('/by-product/:productId', apiKeyAuth, checkProductOwnership, subscriptionController.getAllSubscriptionsByProduct);
router.get('/active/:subscriptionId', apiKeyAuth, subscriptionAuth, subscriptionController.getAllActiveSubscriptions);

module.exports = router;