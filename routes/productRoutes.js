const express = require('express');
const productController = require('../controllers/productController');
const apiKeyAuth = require('../middlewares/apiKeyAuth');

const router = express.Router();

router.get('/by-user', apiKeyAuth, productController.getAllProductsByUser);

module.exports = router;
