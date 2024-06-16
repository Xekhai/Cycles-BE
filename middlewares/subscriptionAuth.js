// middlewares/subscriptionAuth.js
const db = require('../config/firebase'); // Adjust the path to your Firestore config

const subscriptionAuth = async (req, res, next) => {
    const subscriptionId = req.body.subscriptionId ? req.body.subscriptionId : req.params.subscriptionId;
  if (!subscriptionId) {
    return res.status(400).json({ message: 'Subscription ID is required' });
  }

  try {
    const subscriptionRef = db.collection('subscription').doc(subscriptionId);
    const subscriptionDoc = await subscriptionRef.get();

    if (!subscriptionDoc.exists) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    const subscriptionData = subscriptionDoc.data();

    if (subscriptionData.user_id !== req.user.user_id) {
      return res.status(403).json({ message: 'Unauthorized access to this subscription' });
    }

    req.subscription = subscriptionData;
    next();
  } catch (error) {
    console.error('Error verifying subscription access:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = subscriptionAuth;
