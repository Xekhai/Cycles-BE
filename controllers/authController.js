const { firebaseAdmin } = require('../utils/firebaseAdmin');
const jwt = require('jsonwebtoken');

const authController = {
  register: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await firebaseAdmin.createUser({ email, password });
      const token = jwt.sign({ user: { id: user.uid } }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await firebaseAdmin.getUserByEmail(email);
      if (user.password !== password) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      const token = jwt.sign({ user: { id: user.uid } }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
};

module.exports = authController;
