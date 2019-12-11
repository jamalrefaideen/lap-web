var _ = require('lodash');
var async = require('async');

var Promise = require('bluebird');
// set Promise provider to bluebird
require('mongoose').Promise = require('bluebird');
var mongoose = require('mongoose');


var User = require("../user/user.model.js");
var SchoolUserRole = require("../schooluserrole/schooluserrole.model");
var Staff = require("./staff.model.js");


var CONSTANTS = require("../dataconstants/constants");
var UserRoleTypes = CONSTANTS.UserRoleTypes;
var ModelDataTypes = CONSTANTS.ModelDataTypes;
var auditmanager = require("./../../config/auditmanager");

function generate(parsedCsvDataList, loggedUserData) {

    var attributeTypeMapper = {
        'DOB': ModelDataTypes.DATE,
        "userId": ModelDataTypes.OBJECT_ID,
        "schoolId": ModelDataTypes.OBJECT_ID,
        "_id": ModelDataTypes.OBJECT_ID,
        "createdBy": ModelDataTypes.OBJECT_ID,
        "modifiedBy": ModelDataTypes.OBJECT_ID
    };

    var rowLength = parsedCsvDataList.length;
    var modelAttributes = parsedCsvDataList[0];

    var modelAttributeName2IndexMapper = {};
    _.each(modelAttributes, function (modelAttribute, index) {
        modelAttributeName2IndexMapper[modelAttribute] = index;
    });

    return new Promise(function (resolve, reject) {

        async.waterfall([

            function (next) {

                var staffUserModelDataList = [];
                var staffUserFields = ["name", "email", "mobileNumber", "schoolId","profilePictureUrl"];
                for (var rowIndex = 1; rowIndex < rowLength; rowIndex++) {
                    var csvRowData = parsedCsvDataList[rowIndex];
                    var staffUserModelData = createModelData(staffUserFields, csvRowData, attributeTypeMapper, modelAttributeName2IndexMapper);
                    staffUserModelData.password = "lap123";
                    staffUserModelDataList.push(staffUserModelData);
                }
                User.create(staffUserModelDataList, next);
            },


            function (staffUserList, next) {

                var staffUserMapper = {};
                _.each(staffUserList, function (staffUserData) {
                    staffUserMapper[staffUserData.email + "_" + staffUserData.mobileNumber] = staffUserData;
                });
                return next(null, staffUserMapper);
            },

            function (staffUserMapper, next) {

                var schoolUserRoleModelDataList = [];
                for (var rowIndex = 1; rowIndex < rowLength; rowIndex++) {
                    var csvRowData = parsedCsvDataList[rowIndex];

                    var emailIndex = modelAttributeName2IndexMapper["email"];
                    var mobileNumberIndex = modelAttributeName2IndexMapper["mobileNumber"];
                    var staffUserData = staffUserMapper[csvRowData[emailIndex] + "_" + csvRowData[mobileNumberIndex]];

                    var schoolIdIndex = modelAttributeName2IndexMapper["schoolId"];
                    var schoolId = csvRowData[schoolIdIndex];
                    var rolesIndex = modelAttributeName2IndexMapper["roles"];
                    var roles = csvRowData[rolesIndex];

                    createSchoolUserRolesData(staffUserData, schoolId, roles, schoolUserRoleModelDataList);
                }
                SchoolUserRole.create(schoolUserRoleModelDataList, function(err, schoolUserRoleList){
                    return next(err, staffUserMapper);
                });
            },

            function (staffUserMapper, next) {

                var staffFields = [
                    "rollNo", "address", "DOB",
                    "isPrincipal", "isSchoolAdmin",
                    "specialization", "schoolId",
                    "_id","isTeacher"
                ];
                var staffModelDataList = [];
                for (var rowIndex = 1; rowIndex < rowLength; rowIndex++) {
                    var csvRowData = parsedCsvDataList[rowIndex];
                    var modelData = createModelData(staffFields, csvRowData, attributeTypeMapper, modelAttributeName2IndexMapper);

                    var emailIndex = modelAttributeName2IndexMapper["email"];
                    var mobileNumberIndex = modelAttributeName2IndexMapper["mobileNumber"];
                    var staffUserData = staffUserMapper[csvRowData[emailIndex] + "_" + csvRowData[mobileNumberIndex]];
                    modelData.userId = staffUserData._id;
                    //auditmanager.populateCreationAudit(loggedUserData, modelData);
                    staffModelDataList.push(modelData);
                }
                Staff.create(staffModelDataList, next);
            }

        ], function done(err, staffList) {

            if (err) return reject(err);

            console.log("Successfully created staff test data");
            return resolve(staffList);
        });
    });
}


////////////// START of private methods //////////////////

function createModelData(requiredModelAttributes, values, attributeTypeMapper, modelAttributeName2IndexMapper) {

    var modelData = {};
    _.each(requiredModelAttributes, function (modelAttribute) {
        var requiredModelAttributeIndex = modelAttributeName2IndexMapper[modelAttribute];
        if (requiredModelAttributeIndex == -1) return; //THIS is for _id field, which is not availavle during csv import
        var modelValue = values[requiredModelAttributeIndex];
        var modelDataType = attributeTypeMapper[modelAttribute];
        modelData[modelAttribute] = getTypedModelData(modelDataType, modelValue);
    });
    return modelData;
}

function getTypedModelData(modelDataType, modelValue) {

    if (modelDataType == ModelDataTypes.OBJECT_ID) {
        return mongoose.Types.ObjectId(modelValue);
    } else if (modelDataType == ModelDataTypes.DATE) {
        return new Date(modelValue);
    } else {
        return modelValue;
    }
}


function createSchoolUserRolesData(userData, schoolId, roles, modelDataList){

    var activeSchoolUserRoleIdList = roles.split("/");

    _.each(activeSchoolUserRoleIdList, function(roleId){

        var schoolUserModelData = {
            'schoolId':mongoose.Types.ObjectId(schoolId),
            'userId':mongoose.Types.ObjectId(userData._id),
            'roleId':roleId
        };
        modelDataList.push(schoolUserModelData);
    });
}

////////////// END of private methods //////////////////


exports.generate = generate;