const balanceService = require('../services/balanceService');

const balanceController = {
  updateBalance: async (req, res) => {
    try {
      const { cyclesUid } = req.body;
      if (!cyclesUid) {
        return res.status(400).json({ message: 'Cycles UID is required' });
      }
      const result = await balanceService.updateBalance(cyclesUid);
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }
};

module.exports = balanceController;
