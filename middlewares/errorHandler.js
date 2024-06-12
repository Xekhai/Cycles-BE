const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Server Error' });
};

module.exports = errorHandler;
