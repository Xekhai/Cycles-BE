const admin = require('firebase-admin');
const db = admin.firestore();

const productController = {
  getAllProductsByUser: async (req, res) => {
    const userId = req.user.user_id;

    try {
      const productsSnapshot = await db.collection('product').where('user', '==', userId).get();
      const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      res.json(products);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
};

module.exports = productController;
