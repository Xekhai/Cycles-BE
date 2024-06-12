const admin = require('firebase-admin');
const db = admin.firestore();

const analyticsController = {
  getUserAnalytics: async (req, res) => {
    const userId = req.user.user_id;

    try {
      // Get all products for the user
      const productsSnapshot = await db.collection('product').where('user', '==', userId).get();
      const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (products.length === 0) {
        return res.status(404).json({ message: 'No products found for this user' });
      }

      let bestProduct = null;
      let worstProduct = null;
      let totalRevenue = 0;
      let totalSubscriptions = 0;
      let totalActiveSubscriptions = 0;
      let totalInactiveSubscriptions = 0;

      // Iterate over products to calculate metrics
      for (const product of products) {
        const subscriptionsSnapshot = await db.collection('subscription').where('product', '==', db.doc(`product/${product.id}`)).get();
        const subscriptions = subscriptionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const productRevenue = subscriptions.reduce((acc, subscription) => acc + (subscription.rev_ytd || 0), 0);
        const productSubscriptions = subscriptions.length;

        totalRevenue += productRevenue;
        totalSubscriptions += productSubscriptions;

        if (!bestProduct || productRevenue > bestProduct.rev_ytd) {
          bestProduct = { ...product, rev_ytd: productRevenue };
        }

        if (!worstProduct || productRevenue < worstProduct.rev_ytd) {
          worstProduct = { ...product, rev_ytd: productRevenue };
        }

        if (subscriptions.length > 0) {
          // Count active and inactive subscriptions only if there are subscriptions
          const ongoingCyclesSnapshot = await db.collection('ongoing_cycle').where('subscription', 'in', subscriptions.map(sub => db.doc(`subscription/${sub.id}`))).get();
          const now = admin.firestore.Timestamp.now();

          ongoingCyclesSnapshot.forEach(doc => {
            const cycle = doc.data();
            const subscription = subscriptions.find(sub => sub.id === cycle.subscription.id);
            const cycleLength = subscription ? subscription.cycle : 0;
            const dateInitiated = cycle.date_initiated.toDate();
            const isActive = (dateInitiated.getTime() + cycleLength * 24 * 60 * 60 * 1000) > now.toDate().getTime();

            if (isActive) {
              totalActiveSubscriptions++;
            } else {
              totalInactiveSubscriptions++;
            }
          });
        }
      }

      const analyticsData = {
        bestProduct,
        worstProduct,
        totalSubscriptions,
        totalRevenue,
        totalActiveSubscriptions,
        totalInactiveSubscriptions,
      };

      // Save analytics data to Firestore
      await db.collection('analytics').doc(userId).set({
        user_id: userId,
        analytics: analyticsData,
      });

      res.json(analyticsData);
      
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
};

module.exports = analyticsController;
