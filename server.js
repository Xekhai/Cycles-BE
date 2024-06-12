const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const walletRoutes = require('./routes/walletRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const balanceRoutes = require('./routes/balanceRoutes');
const txPinRoutes = require('./routes/txPinRoutes');
const productRoutes = require('./routes/productRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const errorHandler = require('./middlewares/errorHandler');
const apiKeyAuth = require('./middlewares/apiKeyAuth');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/wallet', walletRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/cycles/txpin', txPinRoutes);
app.use('/api/products', productRoutes);
app.use('/api/subscriptions', apiKeyAuth, subscriptionRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
