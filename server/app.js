/**
 * Main application file
 */

'use strict';

// Set default node environment to development  //production  development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var express = require('express');
var mongoose = require('mongoose');
var config = require('./config/environment');
// Connect to database
mongoose.connect(config.mongo.uri, config.mongo.options);
mongoose.connection.on('error', function(err) {
	console.error('MongoDB connection error: ' + err);
	process.exit(-1);
	}
);
// Populate DB with sample data
if(config.seedDB) { require('./config/seed'); }

// Setup server
var app = express();
var server = require('http').createServer(app);

require('./config/express')(app);
require('./routes')(app);

app.use(crashErrorHandler);

// Start server
server.listen(config.port, config.ip, function () {
  console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
});

// if server crashes, it will handle error
function crashErrorHandler(err , req , res) {

  console.log(req.url + " Request attempted to Crash Server");
  console.log(process.domain.id , req.method , req.url , err);

  if(res.status === 401)
  {
    return res.status(401).send("Something bad happened. :(" + err.message);
  }
  res.status(500).send("Something bad happened. :(" + err.message);
}


// Expose app
exports = module.exports = app;
