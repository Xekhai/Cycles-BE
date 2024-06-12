const admin = require('firebase-admin');
const db = require('../config/firebase');

const firebaseAdmin = {
  createUser: async (userData) => {
    const userRef = db.collection('users').doc(userData.uid);
    await userRef.set(userData);
  },
  getUser: async (uid) => {
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    if (!doc.exists) {
      throw new Error('User not found');
    }
    return doc.data();
  },
  // ... other Firebase operations
};

module.exports = firebaseAdmin;
