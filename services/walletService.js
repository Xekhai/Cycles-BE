const algosdk = require('algosdk');
const db = require('../config/firebase');
const CryptoJS = require('crypto-js');
require('dotenv').config();

const algodClient = new algosdk.Algodv2(
  process.env.ALGOD_TOKEN,
  process.env.ALGOD_SERVER,
  process.env.ALGOD_PORT
);

const usdcAssetId = 10458941;
const centralAccount = algosdk.mnemonicToSecretKey(process.env.CENTRAL_WALLET_MNEMONIC);

const walletService = {
  createWallet: async (uid) => {
    // Check if the user exists in the users collection
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new Error('User does not exist');
    }

    // Check if the wallet already exists in the wallets collection
    const walletRef = db.collection('wallets').doc(uid);
    const walletDoc = await walletRef.get();
    if (walletDoc.exists) {
      throw new Error('Wallet already exists for this user');
    }

    // Step 1: Create an Algorand wallet
    const account = algosdk.generateAccount();
    const passphrase = algosdk.secretKeyToMnemonic(account.sk);
    
    // Step 2: Double encrypt the wallet's mnemonic
    const encryptionKeyOne = process.env.ENCRYPTION_KEY_ONE;
    const encryptionKeyTwo = process.env.ENCRYPTION_KEY_TWO;

    const encryptedMnemonicOne = CryptoJS.AES.encrypt(passphrase, encryptionKeyOne).toString();
    const encryptedMnemonicTwo = CryptoJS.AES.encrypt(encryptedMnemonicOne, encryptionKeyTwo).toString();

    // Step 3: Store the double encrypted mnemonic in Firestore
    const walletData = {
      address: account.addr,
      encryptedMnemonic: encryptedMnemonicTwo
    };
    await walletRef.set(walletData);

    // Step 4: Transfer 0.25 Algo from the central wallet to the created wallet
    const params = await algodClient.getTransactionParams().do();
    const txn = algosdk.makePaymentTxnWithSuggestedParams(
      centralAccount.addr,
      account.addr,
      algosdk.algosToMicroalgos(0.25),
      undefined,
      undefined,
      params
    );

    const signedTxn = txn.signTxn(centralAccount.sk);
    const sendTx = await algodClient.sendRawTransaction(signedTxn).do();
    await algosdk.waitForConfirmation(algodClient, sendTx.txId, 4);

    // Step 5: Opt-in to USDC ASA (Asset ID: 31566704 || 10458941)
    const asaId = usdcAssetId;
    const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
      account.addr,
      account.addr,
      undefined,
      undefined,
      0,
      undefined,
      asaId,
      params
    );

    const signedOptInTxn = optInTxn.signTxn(account.sk);
    const sendOptInTx = await algodClient.sendRawTransaction(signedOptInTxn).do();
    await algosdk.waitForConfirmation(algodClient, sendOptInTx.txId, 4);

    return {"address":walletData.address};
  },
  withdraw: async (uid, otp, recipientAddress) => {
    // Check if the wallet exists in the wallets collection
    const walletRef = db.collection('wallets').doc(uid);
    const walletDoc = await walletRef.get();
    if (!walletDoc.exists) {
      throw new Error('Wallet does not exist for this user');
    }

    const walletData = walletDoc.data();
    const walletAddress = walletData.address;

    // Fetch wallet balances
    const accountInfo = await algodClient.accountInformation(walletAddress).do();
    const usdcBalance = accountInfo.assets.find(asset => asset['asset-id'] === usdcAssetId)?.amount / 1e6 || 0;
    const algoBalance = accountInfo.amount / 1e6 || 0;

    if (usdcBalance < 5) {
      throw new Error('USDC balance is less than 5');
    }

    const feeAmount = Math.max(2.5, usdcBalance * 0.01);
    const withdrawalAmount = usdcBalance - feeAmount;

    // Check if OTP matches
    const otpRef = db.collection('withdrawal_OTP').doc(uid);
    const otpDoc = await otpRef.get();
    if (!otpDoc.exists || otpDoc.data().otp !== otp) {
      throw new Error('Invalid OTP');
    }

    // Double decrypt the wallet's mnemonic
    const encryptionKeyOne = process.env.ENCRYPTION_KEY_ONE;
    const encryptionKeyTwo = process.env.ENCRYPTION_KEY_TWO;

    const decryptedMnemonicOne = CryptoJS.AES.decrypt(walletData.encryptedMnemonic, encryptionKeyTwo).toString(CryptoJS.enc.Utf8);
    const decryptedMnemonic = CryptoJS.AES.decrypt(decryptedMnemonicOne, encryptionKeyOne).toString(CryptoJS.enc.Utf8);
    const account = algosdk.mnemonicToSecretKey(decryptedMnemonic);

    // Prepare transactions
    const params = await algodClient.getTransactionParams().do();

    // If Algo balance is less than 0.25, perform funding transaction
    if (algoBalance <= 0.2) {
      const fundingAmount = 0.25 - algoBalance;
      const fundingTxn = algosdk.makePaymentTxnWithSuggestedParams(
        centralAccount.addr,
        walletAddress,
        algosdk.algosToMicroalgos(fundingAmount),
        undefined,
        undefined,
        params
      );
      const signedFundingTxn = fundingTxn.signTxn(centralAccount.sk);
      const sendFundingTx = await algodClient.sendRawTransaction(signedFundingTxn).do();
      await algosdk.waitForConfirmation(algodClient, sendFundingTx.txId, 4);
    }

    // Update params after funding transaction
    const newParams = await algodClient.getTransactionParams().do();

    // Withdrawal transaction
    const withdrawalTxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
      walletAddress,
      recipientAddress,
      undefined,
      undefined,
      withdrawalAmount * 1e6,
      undefined,
      usdcAssetId,
      newParams
    );

    // Fee transaction
    const note = new TextEncoder().encode('Cycles Processing fee');

    const feeTxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
      walletAddress,
      centralAccount.addr,
      undefined,
      undefined,
      feeAmount * 1e6,
      note,
      usdcAssetId,
      newParams
    );

    // Group withdrawal and fee transactions
    const txns = [withdrawalTxn, feeTxn];
    const groupID = algosdk.assignGroupID(txns);
    const signedTxns = txns.map(txn => txn.signTxn(account.sk));

    const sendTx = await algodClient.sendRawTransaction(signedTxns).do();
    await algosdk.waitForConfirmation(algodClient, sendTx.txId, 4);

    return {
      message: 'Withdrawal successful',
      withdrawalAmount: withdrawalAmount,
      feeAmount: feeAmount
    };
  },
  intraWalletTransfer: async (userId, subscriptionId, transactionPin) => {
    // Validate subscription ID
    const subscriptionRef = db.collection('subscription').doc(subscriptionId);
    const subscriptionDoc = await subscriptionRef.get();
    if (!subscriptionDoc.exists) {
      throw new Error('Subscription does not exist');
    }
    const subscriptionData = subscriptionDoc.data();

    // Validate user's wallet
    const userWalletRef = db.collection('wallets').doc(userId);
    const userWalletDoc = await userWalletRef.get();
    if (!userWalletDoc.exists) {
      throw new Error('User wallet does not exist');
    }
    const userWalletData = userWalletDoc.data();

    // Validate transaction pin
    const transactionPinRef = db.collection('transactionPin').where('user_id', '==', userId);
    const transactionPinSnapshot = await transactionPinRef.get();
    if (transactionPinSnapshot.empty || transactionPinSnapshot.docs[0].data().tx_pin !== transactionPin) {
      throw new Error('Invalid transaction pin');
    }

    // Fetch the subscription creator's wallet
    const productRef = subscriptionData.product;
    const productDoc = await productRef.get();
    if (!productDoc.exists) {
      throw new Error('Product associated with the subscription does not exist');
    }
    const productData = productDoc.data();
    const creatorWalletRef = db.collection('wallets').doc(productData.user);
    const creatorWalletDoc = await creatorWalletRef.get();
    if (!creatorWalletDoc.exists) {
      throw new Error('Subscription creator wallet does not exist');
    }
    const creatorWalletData = creatorWalletDoc.data();

    // Get user's wallet balances
    const userAccountInfo = await algodClient.accountInformation(userWalletData.address).do();
    const algoBalance = userAccountInfo.amount / 1e6 || 0;

    // If Algo balance is low, top up the wallet
    if (algoBalance <= 0.2) {
      const fundingAmount = 0.25 - algoBalance;
      const fundingTxn = algosdk.makePaymentTxnWithSuggestedParams(
        centralAccount.addr,
        userWalletData.address,
        algosdk.algosToMicroalgos(fundingAmount),
        undefined,
        undefined,
        await algodClient.getTransactionParams().do()
      );
      const signedFundingTxn = fundingTxn.signTxn(centralAccount.sk);
      const sendFundingTx = await algodClient.sendRawTransaction(signedFundingTxn).do();
      await algosdk.waitForConfirmation(algodClient, sendFundingTx.txId, 4);
    }

    // Fetch updated transaction parameters
    const params = await algodClient.getTransactionParams().do();

    // Transfer subscription amount from user's wallet to creator's wallet
    const amount = subscriptionData.amount * 1e6; // Convert to microalgos
    const transferTxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
      userWalletData.address,
      creatorWalletData.address,
      undefined,
      undefined,
      amount,
      undefined,
      usdcAssetId,
      params
    );

    const signedTransferTxn = transferTxn.signTxn(algosdk.mnemonicToSecretKey(
      CryptoJS.AES.decrypt(
        CryptoJS.AES.decrypt(userWalletData.encryptedMnemonic, process.env.ENCRYPTION_KEY_TWO).toString(CryptoJS.enc.Utf8),
        process.env.ENCRYPTION_KEY_ONE
      ).toString(CryptoJS.enc.Utf8)
    ).sk);

    const sendTransferTx = await algodClient.sendRawTransaction(signedTransferTxn).do();
    await algosdk.waitForConfirmation(algodClient, sendTransferTx.txId, 4);

    // Create an ongoing cycle for the subscription
    const ongoingCycleRef = db.collection('ongoing_cycle').doc();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    await ongoingCycleRef.set({
      user_id: userId,
      date_initiated: new Date(),
      subscription: subscriptionRef,
      user_cycle_id: db.collection('users').doc(userId), // Reference to user document
      amount_paid: subscriptionData.amount,
      subscription_name: subscriptionData.name,
      user_name: userData.display_name,
      email: userData.email
    });

    return {
      message: 'Transfer successful',
      transactionId: sendTransferTx.txId
    };
  }
};

module.exports = walletService;
