/**
 * Created by HP on Mar-16-16.
 */
// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
var amazonConfig = require('./amazon.config.js');

var Expires_Secs = 3600000;
AWS.config.update({accessKeyId: amazonConfig.AWS_ACCESS_KEY_ID, secretAccessKey: amazonConfig.AWS_SECRET_ACCESS_KEY});
var Bucket_Name = amazonConfig.BUCKET;

exports.getPreSignedUrlForUpload = function (fileInfo, callback) {
  var params = {
    Bucket: Bucket_Name,
    Key: fileInfo.name,
    ContentType: fileInfo.type,
    Expires: Expires_Secs,
    ACL: "public-read"
  };

  var s3 = new AWS.S3();
  s3.getSignedUrl('putObject', params, function (err, response) {
    console.log(err);
    var result = {url: response, access_url: "http://" + Bucket_Name + ".s3.amazonaws.com/" + fileInfo.name};
    callback(err, result);
  });
};


exports.getPreSignedUrlForDownload = function (fileInfo, callback) {

  var s3 = new AWS.S3();
  var params = {Bucket: Bucket_Name, Key: fileInfo.name, Expires: 300};
  s3.getSignedUrl('getObject', params, function (err, url) {
    var result = {url: url};
    callback(err, result);
  });
};


exports.getPreSignedProfileUrlForDownload = function (fileInfo, callback) {

  var s3 = new AWS.S3();
  var params = {Bucket: Bucket_Name, Key: fileInfo.name, Expires: 1000};
  s3.getSignedUrl('getObject', params, function (err, url) {
    var result = {url: url};
    callback(err, result);
  });
};
