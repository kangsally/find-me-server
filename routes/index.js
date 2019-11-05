const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const withAuth = require('../middleware');

router.post('/join', async (req, res) => {
  const { id, password } = req.body;
  const point = 10000;
  await User.findOne({ id: id }).exec(async (err, userData) => {
    if (err) {
      return res.status(500).send('Server error! Please try again.');
    }
    if (userData) {
      return res.status(200).send('Already existed id');
    }
    const user = new User({ id, password, point });
    await user.save(err => {
      if (err) {
        res.status(500).send('Server error! Please try again.');
      } else {
        res.status(200).send('Welcome');
      }
    });
  });
});

router.post('/login', (req, res) => {
  const { id, password } = req.body;
  console.log(id, password)
  User.findOne({ id }, (err, user) => {
    if (err) {
      res.status(500).json({
        error: 'Internal error please try again'
      });
    } else if (!user) {
      res.status(401).json({
        error: 'Incorrect id'
      });
    } else {
      user.isCorrectPassword(password, function(err, same) {
        if (err) {
          res.status(500).json({
            error: 'Internal error please try again'
          });
        } else if (!same) {
          res.status(401).json({
            error: 'Incorrect password'
          });
        } else {
          const payload = { id };
          const token = jwt.sign(payload, process.env.SECRETKEY, {
            expiresIn: '5m'
          });
          res
            .cookie('token', token, { httpOnly: true })
            .status(200)
            .json({
              id: id
            });
        }
      });
    }
  });
});

router.get('/checkToken', withAuth, (req, res) => {
  res.sendStatus(200);
});

module.exports = router;
