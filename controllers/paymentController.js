const paymentService = require('../services/paymentService');

const paymentController = {
  generatePaymentUrl: async (req, res) => {
    try {
      const { userId, subscriptionId, userName, email, callback_url, webhook_url } = req.body;

      if (!userId || !subscriptionId || !userName || !email) {
        return res.status(400).json({ message: 'User ID, Subscription ID, User Name, and Email are required' });
      }
      const paymentUrl = await paymentService.generatePaymentUrl(userId, subscriptionId, userName, email, callback_url, webhook_url);
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
  }
};

module.exports = paymentController;
