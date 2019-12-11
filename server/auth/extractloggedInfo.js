/**
 * Created by HP on Oct-14-15.
 */
var config = require('../config/environment');
var jwt = require('jsonwebtoken');
var UnauthorizedError = require('./UnauthorizedError');


module.exports = function (req, res, next) {


  var token;
  if (req.headers && req.headers.authorization) {
    var parts = req.headers.authorization.split(' ');
    if (parts.length == 2) {
      var scheme = parts[0];
      var credentials = parts[1];

      if (/^Bearer$/i.test(scheme)) {
        token = credentials;
      }
    }
  }

  if (!token) return next();


  var secret =config.secrets.session;
  jwt.verify(token, secret, function (err, decoded) {

    if (err) return next(new UnauthorizedError('invalid_token', err));

    req.customerId = decoded.customerId;

    next();
  });


}
