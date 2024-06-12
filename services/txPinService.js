const db = require('../config/firebase');

const txPinService = {
  changeTxPin: async (userId, otp, newTxPin) => {
    // Check if OTP matches
    const otpRef = db.collection('withdrawal_OTP').doc(userId);
    const otpDoc = await otpRef.get();
    if (!otpDoc.exists || otpDoc.data().otp !== otp) {
      throw new Error('Invalid OTP');
    }

    // Update the transaction pin in the transactionPin collection
    const txPinRef = db.collection('transactionPin').doc(userId);
    const txPinDoc = await txPinRef.get();
    if (!txPinDoc.exists) {
      throw new Error('Transaction pin document does not exist');
    }

    await txPinRef.update({
      tx_pin: newTxPin
    });

    return { message: 'Transaction pin updated successfully' };
  }
};

module.exports = txPinService;
