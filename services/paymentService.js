// services/paymentService.js
const db = require('../config/firebase');
require('dotenv').config();
const axios = require('axios');

const paymentService = {
  generateSubscriptionPaymentUrl: async (userId, subscriptionId, userName, email, callback_url, webhook_url) => {
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      throw new Error('Invalid subscription ID');
    }

    // Check if the subscription exists in the subscription collection
    const subscriptionRef = db.collection('subscription').doc(subscriptionId);
    const subscriptionDoc = await subscriptionRef.get();
    if (!subscriptionDoc.exists) {
      throw new Error('Subscription does not exist');
    }

    // Get the product associated with the subscription
    const subscriptionData = subscriptionDoc.data();
    const productRef = subscriptionData.product;
    const productId = productRef.id; // Extract the product ID
    if (!productId || typeof productId !== 'string') {
      throw new Error('Invalid product ID associated with the subscription');
    }

    const productDoc = await productRef.get();
    if (!productDoc.exists) {
      throw new Error('Product associated with the subscription does not exist');
    }

    // Get the wallet associated with the product
    const productData = productDoc.data();
    const walletId = productData.user;
    if (!walletId || typeof walletId !== 'string') {
      throw new Error('Invalid wallet ID associated with the product');
    }

    const walletRef = db.collection('wallets').doc(walletId);
    const walletDoc = await walletRef.get();
    if (!walletDoc.exists) {
      throw new Error('Wallet associated with the product does not exist');
    }

    // Create a new document in the payments collection
    const paymentsRef = db.collection('payments');
    const newPaymentRef = paymentsRef.doc();
    const paymentData = {
      user_id: userId,
      subscription: subscriptionRef,
      wallet: walletRef,
      userName: userName,
      email: email,
      date_initiated: new Date(),
      completed: false,
      algorand_url_postFix: `?amount=${subscriptionData.amount * 1000000}&asset=10458941&note=`
    };
    
    if (typeof webhook_url !== 'undefined') {
      paymentData.webhook_url = webhook_url;
    }
    
    if (typeof callback_url !== 'undefined') {
      paymentData.callback_url = callback_url;
    }
    
    await newPaymentRef.set(paymentData);

    // Construct the payment URL
    const paymentUrl = `${process.env.APP_BASE_URL}payments?cyclesReference=${newPaymentRef.id}`;

    return paymentUrl;
  },
  confirmPayment: async (paymentId) => {
    // Convert payment ID to base64
    const base64PaymentId = Buffer.from(paymentId).toString('base64');
    
    // Get the payment document
    const paymentRef = db.collection('payments').doc(paymentId);
    const paymentDoc = await paymentRef.get();
    if (!paymentDoc.exists) {
      throw new Error('Payment does not exist');
    }

    const paymentData = paymentDoc.data();

    // Check if the payment is already completed
    if (paymentData.completed) {
      return { message: 'Payment already confirmed', transactionId: paymentData.transaction_id };
    }

    // Get the wallet address from the wallet reference
    const walletRef = paymentData.wallet;
    const walletDoc = await walletRef.get();
    if (!walletDoc.exists) {
      throw new Error('Wallet does not exist');
    }

    const walletData = walletDoc.data();
    const walletAddress = walletData.address;

    // Get the IDX URL from the environment variables
    const idxUrl = process.env.ALGO_IDX_URL;

    // Make a GET request to the IDX URL with the wallet address and base64-encoded payment reference
    const url = `${idxUrl}/v2/accounts/${walletAddress}/transactions?note-prefix=${base64PaymentId}&tx-type=axfer`;
    const response = await axios.get(url);
    const transactions = response.data.transactions;

    // Find the transaction where the note matches the base64 of the payment ID
    const matchingTransaction = transactions.find(tx => tx.note === base64PaymentId);
    if (!matchingTransaction) {
      throw new Error('No matching transaction found');
    }

    // Get the subscription and confirm the amount match
    const subscriptionRef = paymentData.subscription;
    const subscriptionDoc = await subscriptionRef.get();
    if (!subscriptionDoc.exists) {
      throw new Error('Subscription does not exist');
    }

    const subscriptionData = subscriptionDoc.data();
    const subscriptionAmount = subscriptionData.amount;

    // Multiply the amount by 1,000,000 to match the transaction amount
    const expectedAmount = subscriptionAmount * 1000000;

    if (matchingTransaction['asset-transfer-transaction'].amount !== expectedAmount) {
      throw new Error('Transaction amount does not match subscription amount');
    }

    // Update the payment status to completed
    await paymentRef.update({
      completed: true,
      date_completed: new Date(),
      transaction_id: matchingTransaction.id,
      webhook_failed: false  // Initialize as false
    });

    // Add an entry to the ongoing_cycle collection
    const ongoingCycleRef = db.collection('ongoing_cycle').doc();
    await ongoingCycleRef.set({
      user_id: paymentData.user_id,
      date_initiated: new Date(),
      subscription: subscriptionRef,
    });

    // Update the rev_ytd property of the subscription
    const newRevYtd = (subscriptionData.rev_ytd || 0) + subscriptionAmount;
    await subscriptionRef.update({
      rev_ytd: newRevYtd
    });

    // Send webhook notification if webhook_url exists
    if (paymentData.webhook_url) {
      const webhookPayload = {
        user_id: paymentData.user_id,
        date_initiated: new Date(),
        subscription: subscriptionRef
      };

      try {
        await axios.post(paymentData.webhook_url, webhookPayload);
      } catch (error) {
        console.error('Error sending webhook:', error);
        // Update payment document to indicate webhook failed
        await paymentRef.update({
          webhook_failed: true
        });
        return { message: 'Payment confirmed, but webhook failed', transactionId: matchingTransaction.id };
      }
    }

    // If no webhook or webhook sent successfully, ensure webhook_failed is false
    await paymentRef.update({
      webhook_failed: false
    });

    return { message: 'Payment confirmed', transactionId: matchingTransaction.id };
  },
  generateOneTimePaymentUrl: async (userId, productId, amount, userName, email, callback_url, webhook_url) => {
    if (!productId || typeof productId !== 'string') {
      throw new Error('Invalid product ID');
    }

    if (!amount || typeof amount !== 'number') {
      throw new Error('Invalid amount');
    }

    // Check if the product exists
    const productRef = db.collection('product').doc(productId);
    const productDoc = await productRef.get();
    if (!productDoc.exists) {
      throw new Error('Product does not exist');
    }

    // Get the wallet associated with the product
    const productData = productDoc.data();
    const walletId = productData.user;
    if (!walletId || typeof walletId !== 'string') {
      throw new Error('Invalid wallet ID associated with the product');
    }

    const walletRef = db.collection('wallets').doc(walletId);
    const walletDoc = await walletRef.get();
    if (!walletDoc.exists) {
      throw new Error('Wallet associated with the product does not exist');
    }

    // Create a new document in the cycle-pay collection
    const cyclePayRef = db.collection('cycle-pay');
    const newCyclePayRef = cyclePayRef.doc();
    const paymentData = {
      user_id: userId,
      product: productRef,
      wallet: walletRef,
      userName: userName,
      email: email,
      date_initiated: new Date(),
      completed: false,
      amount: amount,
      algorand_url_postFix: `?amount=${amount * 1000000}&asset=10458941&note=`
    };

    if (typeof webhook_url !== 'undefined') {
      paymentData.webhook_url = webhook_url;
    }

    if (typeof callback_url !== 'undefined') {
      paymentData.callback_url = callback_url;
    }

    await newCyclePayRef.set(paymentData);

    // Construct the payment URL
    const paymentUrl = `${process.env.APP_BASE_URL}pay?cyclePayReference=${newCyclePayRef.id}`;

    return paymentUrl;
  },
  confirmOneTimePayment: async (paymentId) => {
    // Convert payment ID to base64
    const base64PaymentId = Buffer.from(paymentId).toString('base64');

    // Get the payment document from the cycle-pay collection
    const paymentRef = db.collection('cycle-pay').doc(paymentId);
    const paymentDoc = await paymentRef.get();
    if (!paymentDoc.exists) {
      throw new Error('Payment does not exist');
    }

    const paymentData = paymentDoc.data();

    // Check if the payment is already completed
    if (paymentData.completed) {
      return { message: 'Payment already confirmed', transactionId: paymentData.transaction_id };
    }

    // Get the wallet address from the wallet reference
    const walletRef = paymentData.wallet;
    const walletDoc = await walletRef.get();
    if (!walletDoc.exists) {
      throw new Error('Wallet does not exist');
    }

    const walletData = walletDoc.data();
    const walletAddress = walletData.address;

    // Get the IDX URL from the environment variables
    const idxUrl = process.env.ALGO_IDX_URL;

    // Make a GET request to the IDX URL with the wallet address and base64-encoded payment reference
    const url = `${idxUrl}/v2/accounts/${walletAddress}/transactions?note-prefix=${base64PaymentId}&tx-type=axfer`;
    const response = await axios.get(url);
    const transactions = response.data.transactions;

    // Find the transaction where the note matches the base64 of the payment ID
    const matchingTransaction = transactions.find(tx => tx.note === base64PaymentId);
    if (!matchingTransaction) {
      throw new Error('No matching transaction found');
    }

    // Confirm the amount matches the expected amount
    const expectedAmount = paymentData.amount * 1000000;

    if (matchingTransaction['asset-transfer-transaction'].amount !== expectedAmount) {
      throw new Error('Transaction amount does not match expected amount');
    }

    // Update the payment status to completed
    await paymentRef.update({
      completed: true,
      date_completed: new Date(),
      transaction_id: matchingTransaction.id,
      webhook_failed: false  // Initialize as false
    });

    // Send webhook notification if webhook_url exists
    if (paymentData.webhook_url) {
      const webhookPayload = {
        user_id: paymentData.user_id,
        date_initiated: paymentData.date_initiated,
        product_id: paymentData.product.id,
        amount: paymentData.amount,
        transaction_id: matchingTransaction.id
      };

      try {
        await axios.post(paymentData.webhook_url, webhookPayload);
      } catch (error) {
        console.error('Error sending webhook:', error);
        // Update payment document to indicate webhook failed
        await paymentRef.update({
          webhook_failed: true
        });
        return { message: 'Payment confirmed, but webhook failed', transactionId: matchingTransaction.id };
      }
    }

    // If no webhook or webhook sent successfully, ensure webhook_failed is false
    await paymentRef.update({
      webhook_failed: false
    });

    return { message: 'Payment confirmed', transactionId: matchingTransaction.id };
  }
};

module.exports = paymentService;