const txPinService = require('../services/txPinService');

const txPinController = {
  changeTxPin: async (req, res) => {
    try {
      const { userId, otp, newTxPin } = req.body;
      if (!userId || !otp || !newTxPin) {
        return res.status(400).json({ message: 'User ID, OTP, and new transaction pin are required' });
      }
      const result = await txPinService.changeTxPin(userId, otp, newTxPin);
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }
};

module.exports = txPinController;