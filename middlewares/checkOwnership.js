const db = require('../config/firebase'); // Adjust the path to your Firestore config

const checkProductOwnership = async (req, res, next) => {
  const userId = req.user.user_id;
  const { productId } = req.params;

  try {
    const productRef = db.collection('product').doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const productData = productDoc.data();
    if (productData.user !== userId) {
      return res.status(403).json({ message: 'Unauthorized access to this product' });
    }

    req.product = productData;

    next();
  } catch (error) {
    console.error('Error verifying product ownership:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  checkProductOwnership,
};