'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var MainMenuConfigSchema = new Schema({
  role: String,
  viewUrl: String,
  refState:String,
  tooltip:String,
  order:Number,
  feature:String,
  active:Boolean,
  iconClass:String,
  webIcon:String,
  displayName:String
});

module.exports = mongoose.model('MainMenuConfig', MainMenuConfigSchema);
