/**
 * Express configuration
 */

'use strict';

var express = require('express');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var compression = require('compression');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var cookieParser = require('cookie-parser');
var errorHandler = require('errorhandler');
var path = require('path');
var config = require('./environment');
var passport = require('passport');

module.exports = function(app) {
  var env = app.get('env');

  ////Added by Ashraf on 2-12-2014 to allow cross domain access for testing Table App
  //app.all( "*", function( req, res, next ) {
  //  //Use a Specific Origin
  //  res.header( "Access-Control-Allow-Origin", "http://localhost:4000" );
  //  res.header( "Access-Control-Allow-Credentials", "true" );
  //  res.header( "Access-Control-Allow-Methods", "GET, POST, PUT, DELETE,OPTIONS" );
  //  res.header( "Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept,Authorization" );
  //  next();
  //}
  //);
  app.set('views', config.root + '/server/views');
  app.engine('html', require('ejs').renderFile);
  app.set('view engine', 'html');
  app.use(compression());
  app.use(bodyParser.json({limit: '50mb'}));
  app.use(bodyParser.urlencoded({limit: '50mb',extended: false}));
  app.use(methodOverride());
  app.use(cookieParser());
  app.use(passport.initialize());
  if ('production' === env) {
    app.use(favicon(path.join(config.root, 'public', 'favicon.ico')));
    app.use(express.static(path.join(config.root, 'public')));
    app.set('appPath', path.join(config.root, 'public'));
    app.use(morgan('dev'));
  }

  if ('development' === env || 'test' === env) {
    app.use(require('connect-livereload')());
    app.use(express.static(path.join(config.root, '.tmp')));
    app.use(express.static(path.join(config.root, 'client')));
    app.set('appPath', path.join(config.root, 'client'));
    app.use(morgan('dev'));
    app.use(errorHandler()); // Error handler - has to be last
  }
};
