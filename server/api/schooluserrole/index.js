'use strict';

var express = require('express');
var controller = require('./schooluserrole.controller');

var router = express.Router();

router.get('/', controller.getSchoolUserRolesList);
router.get('/schoolAdmin/role/count', controller.getSchoolAdminByCount);
router.get('/staffRole/:userId', controller.getStaffRoleByUserId);
module.exports = router;
