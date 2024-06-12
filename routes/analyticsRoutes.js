const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const apiKeyAuth = require('../middlewares/apiKeyAuth');

const router = express.Router();

router.get('/user-analytics', apiKeyAuth, analyticsController.getUserAnalytics);

module.exports = router;
