'use strict';

var _ = require('lodash');
var URL = require('url-parse');

var elasticSearchServerUrl = "localhost:9200";

//var elasticSearchServerUrl = process.env.SEARCHBOX_URL || "https://paas:25c299bb578d3172fe401fc85dbb4834@dwalin-us-east-1.searchly.com";

//"https://site:a8e73d7f49838b994621fc84a10507b5@dwalin-us-east-1.searchly.com";


function configureElasticSearch() {

  createIndexMapping();

  indexExistingDocuments();
}



function createIndexMapping() {

  var Products = require('../api/products/products.model');

  createMapping(Products,'products');
}



function createMapping(mongoModel,modelName)
{
  mongoModel.createMapping(function(err, mapping){
    if(err){
      console.log('error creating '+modelName+' mapping (you can safely ignore this)');
      console.log(err);
    }else{
      console.log(modelName+' mapping created!');
      console.log(mapping);
    }
  });
}



function indexExistingDocuments(){

  var Products = require('../api/products/products.model');

  synchronizeExistingDocuments(Products,'Products');
}



function synchronizeExistingDocuments(mongoModel,modelName)
{
  var stream = mongoModel.synchronize()
    , count = 0;

  stream.on('data', function(err, doc){
    count++;
  });
  stream.on('close', function(){
    console.log('indexed ' + count + ' '+modelName+' documents!');
  });
  stream.on('error', function(err){
    console.log("Err occured while sychrinizing  "+modelName+"  - "+err);
  });
}








function getConfigObject() {

    var urlParser = new URL(elasticSearchServerUrl);

    var congigObject = {
        host:urlParser.host,
        port: 80,
        auth: urlParser.auth
    };

    return congigObject;
}



exports.configureElasticSearch = configureElasticSearch;
exports.getConfigObject = getConfigObject;
exports.elasticSearchServerUrl = elasticSearchServerUrl;
