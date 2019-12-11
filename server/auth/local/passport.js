var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

exports.setup = function (User, config) {
  passport.use(new LocalStrategy({
      usernameField: 'mobileNumber',
      passwordField: 'password' // this is the virtual field on the model
    },
    function(mobileNumber, password, done) {
      var query = {
        'mobileNumber':mobileNumber,
        'isDeleted':false
      };
      User.findOne(query, function(err, user) {
        if (err) return done(err);
        if (!user) {
          return done(null, false, { message: 'This mobile number is not available with our school.' });
        }
        if (!user.activated) {
          return done(null, false, { message: 'This mobile number is not activated.' });
        }
        if (!user.authenticate(password)) {
          return done(null, false, { message: 'This password is not correct.' });
        }
        return done(null, user);
      });
    }
  ));
};