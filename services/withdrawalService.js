const sendWithdrawalOTP = require('../utils/sendWithdrawalOTP');

const withdrawalService = {
  sendOTP: async (email, otp) => {
    try {
      const success = await sendWithdrawalOTP(email, otp);
      return success;
    } catch (error) {
      console.error("Error sending withdrawal OTP:", error);
      return false;
    }
  }
};

module.exports = withdrawalService;
