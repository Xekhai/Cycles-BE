const db = require('../config/firebase');
const axios = require('axios');
require('dotenv').config();

const balanceService = {
  updateBalance: async (cyclesUid) => {
    // Get the wallet document from the wallets collection using the cyclesUid
    const walletRef = db.collection('wallets').doc(cyclesUid);
    const walletDoc = await walletRef.get();
    if (!walletDoc.exists) {
      throw new Error('Wallet does not exist');
    }

    const walletData = walletDoc.data();
    const walletAddress = walletData.address;

    // Get the IDX URL from the environment variables
    const idxUrl = process.env.ALGO_IDX_URL;

    // Make a GET request to the IDX URL with the wallet address and asset ID
    const url = `${idxUrl}/v2/accounts/${walletAddress}/assets?asset-id=10458941`;
    const response = await axios.get(url);
    const assets = response.data.assets;

    // Find the asset with the specified asset ID
    const asset = assets.find(a => a['asset-id'] === 10458941);
    if (!asset) {
      throw new Error('Asset not found');
    }

    // Calculate the balance in the asset
    const balance = (asset.amount / 1000000).toFixed(2);

    // Update or create the balance document in the balances collection
    const balanceRef = db.collection('balances').doc(cyclesUid);
    const balanceDoc = await balanceRef.get();
    if (balanceDoc.exists) {
      await balanceRef.update({
        balance: parseFloat(balance)
      });
    } else {
      await balanceRef.set({
        user_id: cyclesUid,
        balance: parseFloat(balance)
      });
    }

    return { message: 'Balance updated', balance: parseFloat(balance) };
  }
};

module.exports = balanceService;
