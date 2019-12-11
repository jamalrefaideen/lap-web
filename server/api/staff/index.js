'use strict';

var express = require('express');
var controller = require('./staff.controller');

var router = express.Router();

router.post('/', controller.createStaff);
router.post('/bulk/add', controller.createStaffByBulkOperation);
router.post('/birthdaywish', controller.wishBirthday);
router.post('/delete/:staffId', controller.updateStaffDelete);

router.put('/update', controller.updateEditStaffDetails);

router.get('/', controller.getStaffList);
router.get('/:staffId/edit', controller.getStaffObj);
router.get('/dashboard/:date', controller.getStaffDashboardDetailsByUserId);
router.get('/:id', controller.getStaffById);
router.get('/principal/view', controller.getPrincipalMaster);
router.get('/schooladmin/:userId', controller.getStaffByUserId);
router.get('/byemail/:email', controller.getStaffByEmail);
router.get('/bymobile/:mobileNumber', controller.getStaffByMobileNumber);
router.get('/:date/dashboard/web', controller.getStaffDashboardDetailsToWeb);
router.get('/:date/principal/dashboard', controller.getPrincipalDashboardDetailsByUserId);
router.get('/:date/schooladmin/dashboard', controller.getSchoolAdminDashboardDetailsByUserId);
router.get('/school/colleagues', controller.getAllSchoolColleagueList);
router.get('/klasssection/:klassSectionId/colleagues', controller.getAllKlassSectionColleagueList);
router.get('/unassigned/list', controller.getUnassignedStaffList);
router.post('/validate/import/contents', controller.findStaffsByImportData);

module.exports = router;

