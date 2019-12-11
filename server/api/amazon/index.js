'use strict';

var Router = require ('express');
var controller = require ('./amazon.controller.js');

var router = new Router();

router.post('/upload/presignedurl', controller.getPresignedUrlToUpload);
router.post('/generate/upload/policy', controller.generateUploadPolicy);
router.get('/open/file/:filename', controller.openS3UrlFile);

module.exports = router;
