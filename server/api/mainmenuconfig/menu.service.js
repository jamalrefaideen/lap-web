

var MainMenuConfig = require("../mainmenuconfig/mainmenuconfig.model");
var _ = require('lodash');
var mongoose = require("mongoose");
var Promise = require('bluebird');
mongoose.Promise = Promise;

var menusByRoleName = null;

exports.collectMenu = function(){
    if(menusByRoleName) return Promise.resolve(menusByRoleName);
   return  MainMenuConfig.find()
        .sort({order: 1})
        .lean()
        .then(function (mainMenus) {
            menusByRoleName = _.groupBy(mainMenus, "role");
            return menusByRoleName;
        })
       .catch(function(error){
           console.error(error);
           return error;
       })

}