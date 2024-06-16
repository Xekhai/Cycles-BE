const paymentService = require('../services/paymentService');
const walletService = require('../services/walletService')

const paymentController = {
  generateSubscriptionPaymentUrl: async (req, res) => {
    try {
      const { userId, subscriptionId, userName, email, callback_url, webhook_url } = req.body;

      if (!userId || !subscriptionId || !userName || !email) {
        return res.status(400).json({ message: 'User ID, Subscription ID, User Name, and Email are required' });
      }
      const paymentUrl = await paymentService.generateSubscriptionPaymentUrl(userId, subscriptionId, userName, email, callback_url, webhook_url);
      res.json({ paymentUrl });
    } catch (err) {
      console.error(err);
      if (['Subscription does not exist', 'Product associated with the subscription does not exist', 'Wallet associated with the product does not exist', 'Invalid subscription ID', 'Invalid product ID associated with the subscription', 'Invalid wallet ID associated with the product'].includes(err.message)) {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: 'Server Error' });
    }
  },
  confirmPayment: async (req, res) => {
    try {
      const { paymentId } = req.body;
      if (!paymentId) {
        return res.status(400).json({ message: 'Payment ID is required' });
      }
      const result = await paymentService.confirmPayment(paymentId);
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  },
  generateOneTimePaymentUrl: async (req, res) => {
    try {
      const { userId, productId, amount, userName, email, callback_url, webhook_url } = req.body;

      if (!userId || !productId || !amount || !userName || !email) {
        return res.status(400).json({ message: 'User ID, Product ID, Amount, User Name, and Email are required' });
      }

      const paymentUrl = await paymentService.generateOneTimePaymentUrl(userId, productId, amount, userName, email, callback_url, webhook_url);
      res.json({ paymentUrl });
    } catch (err) {
      console.error(err);
      if (['Product does not exist', 'Wallet associated with the product does not exist', 'Invalid product ID', 'Invalid amount', 'Invalid wallet ID associated with the product'].includes(err.message)) {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: 'Server Error' });
    }
  },
  confirmOneTimePayment: async (req, res) => {
    try {
      const { paymentId } = req.body;
      if (!paymentId) {
        return res.status(400).json({ message: 'Payment ID is required' });
      }
      const result = await paymentService.confirmOneTimePayment(paymentId);
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  },
  intraWalletTransfer: async (req, res) => {
    try {
      const { subscriptionId, transactionPin } = req.body;
      const userId = req.user.user_id;

      if (!userId || !transactionPin || !subscriptionId) {
        return res.status(400).json({ message: 'Subscription ID, and Transaction PIN are required' });
      }

      const result = await walletService.intraWalletTransfer(userId, subscriptionId, transactionPin);
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }
};

module.exports = paymentController;
