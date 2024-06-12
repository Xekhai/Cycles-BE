const admin = require('firebase-admin');
require('dotenv').config();
const path = require('path');

const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-database-name.firebaseio.com"
});

const db = admin.firestore();

module.exports = db;