const admin = require('firebase-admin');
const db = admin.firestore();

const subscriptionController = {
  getAllSubscriptionsByProduct: async (req, res) => {
    const { productId } = req.params;

    try {
      const subscriptionsSnapshot = await db.collection('subscription').where('product', '==', db.doc(`product/${productId}`)).get();
      const subscriptions = subscriptionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      res.json(subscriptions);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  getAllActiveSubscriptions: async (req, res) => {
    const { subscriptionId } = req.params;

    try {
      const ongoingCyclesSnapshot = await db.collection('ongoing_cycle').where('subscription', '==',  db.doc(`subscription/${subscriptionId}`)).get();
      const now = admin.firestore.Timestamp.now();
      const activeSubscriptions = [];
      for (const doc of ongoingCyclesSnapshot.docs) {
        const cycleData = doc.data();
        const subscriptionRef = cycleData.subscription;
        const subscriptionDoc = await subscriptionRef.get();

        if (subscriptionDoc.exists) {
          const subscriptionData = subscriptionDoc.data();
          const cycleLength = subscriptionData.cycle;
          const dateInitiated = cycleData.date_initiated;
          const cycleEnd = dateInitiated.toDate().getTime() + cycleLength * 24 * 60 * 60 * 1000;

          if (now.toMillis() <= cycleEnd) {
            activeSubscriptions.push({
              ...cycleData,
              subscription: subscriptionData,
              cycle_id: doc.id,
            });
          }
        }
      }

      res.json(activeSubscriptions);
    } catch (error) {
      console.error('Error fetching active subscriptions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
};

module.exports = subscriptionController;
