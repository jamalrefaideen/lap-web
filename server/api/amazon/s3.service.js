var s3 = require('s3');
var path = require('path');
var fs = require('fs');

var amazonConfig = require('./amazon.config.js');
var aws_access_key_id = amazonConfig.AWS_ACCESS_KEY_ID;
var aws_secret_access_key = amazonConfig.AWS_SECRET_ACCESS_KEY;
var bucket = amazonConfig.BUCKET;


var client = s3.createClient({
  s3Options: {
    accessKeyId: aws_access_key_id,
    secretAccessKey: aws_secret_access_key
  }
});


//https://github.com/andrewrk/node-s3-client
exports.uploadPdfFile = function (fileName, pdfDirectoryPath, callback) {

  var params = {
    localFile: pdfDirectoryPath,
    s3Params: {
      Bucket: bucket,
      Key: fileName
    }
  };

  var uploader = client.uploadFile(params);
  uploader.on('error', function (err) {
    console.error("unable to upload:", err.stack);
    callback(err);
  });
  uploader.on('end', function () {
    console.log("done uploading");
    callback(null, {});
  });
};



