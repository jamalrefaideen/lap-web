'use strict';

// Development specific configuration
// ==================================
module.exports = {
  // MongoDB connection options
  mongo: {

      //uri: 'mongodb://localhost/lapweb-test'
      uri: 'mongodb://localhost/lapdb'
      //uri: 'mongodb://localhost/lapprod'
      //uri: 'mongodb://admin:admin123@ds111103.mlab.com:11103/lapweb-test'
      //uri: 'mongodb://admin:admin123@ds129074-a0.mlab.com:29074/lapdb'
  },

  seedDB: true
};
