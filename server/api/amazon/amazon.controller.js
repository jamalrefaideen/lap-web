var AmazonService  = require("./amazon.service.js");
var S3Policy = require("./s3policy");
var S3Config = require("./amazon.config");
exports.getPresignedUrlToUpload = function(req, res) {

  AmazonService.getPreSignedUrlForUpload(req.body, function (err, result) {
    res.send(result);
  });

};

exports.generateUploadPolicy = function(req, res){
    var requestInfo = req.body;
    var uniqueId =  new Date().getTime();
    var filename = requestInfo.name + "_" + uniqueId;
    const options = {
        bucket: "spmt",
        region: "us-east-1",
        accessKey: S3Config.AWS_ACCESS_KEY_ID,
        secretKey:S3Config.AWS_SECRET_ACCESS_KEY,
        successActionStatus: 201,
        key : filename,
        contentType : requestInfo.type,
        date : new Date()
    };
    var policy = S3Policy.generate(options);
    res.status(200).send(policy);
    
};

exports.openS3UrlFile = function(req, res) {

  AmazonService.getPreSignedUrlForDownload({name: req.params.filename}, function (err, result) {
    res.redirect(result.url);

  });

};

