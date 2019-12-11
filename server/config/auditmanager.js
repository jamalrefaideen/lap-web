'use strict';

var mongoose = require("mongoose");


function populateCreationAudit(loggedUserData, entitySchema){

    var userId = mongoose.Types.ObjectId(loggedUserData.userId);

    entitySchema.createdOn = new Date();
    entitySchema.createdBy = userId;

    entitySchema.modifiedOn = new Date();
    entitySchema.modifiedBy = userId;
}


function populateCreationAccountAudit(loggedUserData, entitySchema){

    var userId = mongoose.Types.ObjectId(loggedUserData.userId);
    var schoolId = mongoose.Types.ObjectId(loggedUserData.schoolId);

    entitySchema.schoolId = schoolId;

    entitySchema.createdOn = new Date();
    entitySchema.createdBy = userId;

    entitySchema.modifiedOn = new Date();
    entitySchema.modifiedBy = userId;
}


function populateCreationAcademicAccountAudit(loggedUserData, entitySchema){

    var userId = mongoose.Types.ObjectId(loggedUserData.userId);
    var schoolId = mongoose.Types.ObjectId(loggedUserData.schoolId);

    var academicYearData = loggedUserData.academicYearData;
    var academicYearId = mongoose.Types.ObjectId(academicYearData._id);

    entitySchema.academicYearId = academicYearId;
    entitySchema.schoolId = schoolId;

    entitySchema.createdOn = new Date();
    entitySchema.createdBy = userId;

    entitySchema.modifiedOn = new Date();
    entitySchema.modifiedBy = userId;
}


function populateUpdateAudit(loggedUserData, entitySchema){

    var userId = mongoose.Types.ObjectId(loggedUserData.userId);
    var schoolId = loggedUserData.schoolId;

    entitySchema.modifiedOn = new Date();
    entitySchema.modifiedBy = userId;
}


exports.populateCreationAcademicAccountAudit = populateCreationAcademicAccountAudit;
exports.populateCreationAccountAudit = populateCreationAccountAudit;
exports.populateCreationAudit = populateCreationAudit;
exports.populateUpdateAudit = populateUpdateAudit;


