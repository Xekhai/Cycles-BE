require('dotenv').config();
const { CourierClient } = require("@trycourier/courier");

const courier = new CourierClient({ authorizationToken: process.env.COURIER_AUTHORIZATION_KEY });

async function sendWithdrawalOTP(email, otp) {
  try {
    const { requestId } = await courier.send({
      message: {
        content: {
          title: "Cycles OTP",
          body: `Your cycles OTP is: ${otp}`
        },
        data: {},
        to: {
          email: email
        }
      }
    });
    console.log(`Courier request ID: ${requestId}`);
    return true;
  } catch (error) {
    console.error("Error sending message via Courier:", error);
    return false;
  }
}

module.exports = sendWithdrawalOTP;
