const walletService = require('../services/walletService');
const sendWithdrawalOTP = require('../utils/sendWithdrawalOTP');
const db = require('../config/firebase');

const walletController = {
  createWallet: async (req, res) => {
    try {
      const { uid } = req.body;
      if (!uid) {
        return res.status(400).json({ message: 'UID is required' });
      }
      const walletData = await walletService.createWallet(uid);
      res.json(walletData);
    } catch (err) {
      console.error(err);
      if (err.message === 'User does not exist' || err.message === 'Wallet already exists for this user') {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: 'Server Error' });
    }
  },
  
  withdraw: async (req, res) => {
    try {
      const { uid, otp, recipientAddress } = req.body;
      if (!uid || !otp || !recipientAddress) {
        return res.status(400).json({ message: 'UID, OTP, and recipientAddress are required' });
      }
      const result = await walletService.withdraw(uid, otp, recipientAddress);
      res.json(result);
    } catch (err) {
      console.error(err);
      if (err.message === 'Wallet does not exist for this user' || err.message === 'Invalid OTP' || err.message === 'USDC balance is less than 5') {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: 'Server Error' });
    }
  }
};

const withdrawalController = {
  generateOTP: async (req, res) => {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ message: 'UID is required' });
    }
    try {
      // Check if the user exists
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        return res.status(404).json({ message: 'User not found' });
      }

      const userData = userDoc.data();
      const email = userData.email;

      // Generate OTP
      const otp = Math.floor(0 + Math.random() * 100000).toString().padStart(5, '0');

      // Save OTP to Firestore
      await db.collection('withdrawal_OTP').doc(uid).set({ otp });

      // Send OTP via Courier
      const success = await sendWithdrawalOTP(email, otp);

      if (success) {
        return res.status(200).json({ message: 'Withdrawal OTP sent successfully' });
      } else {
        return res.status(500).json({ message: 'Error sending withdrawal OTP' });
      }
    } catch (error) {
      console.error("Error creating withdrawal OTP:", error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

};

module.exports = {walletController,withdrawalController};
