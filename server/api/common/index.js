'use strict';

var Router = require ('express');
var controller = require ('./common.controller');

var router = new Router();


router.get('/firebase/config', controller.getFireBaseConfig);


module.exports = router;
