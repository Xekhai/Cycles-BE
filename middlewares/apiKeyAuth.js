const admin = require('firebase-admin');

const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers['api-secret-key'];

  if (!apiKey) {
    return res.status(403).json({ message: 'No API key provided' });
  }

  try {
    const usersSnapshot = await admin.firestore().collection('users').where('api_secret_key', '==', apiKey).get();

    if (usersSnapshot.empty) {
      return res.status(403).json({ message: 'Invalid API key' });
    }

    const user = usersSnapshot.docs[0].data();
    req.user = {
      user_id: user.uid,
    };
    next();
  } catch (error) {
    console.error('Error verifying API key:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = apiKeyAuth;
