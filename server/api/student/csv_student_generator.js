
var _ = require('lodash');
var async = require('async');
var path = require('path');

var Promise = require('bluebird');
// set Promise provider to bluebird
require('mongoose').Promise = require('bluebird');
var mongoose = require('mongoose');

var config = require("./../../config/environment/index");

var User = require("../user/user.model.js");
var SchoolUserRole = require("../schooluserrole/schooluserrole.model");
var Parent = require("../parent/parent.model.js");
var Student = require("./student.model.js");


var CONSTANTS = require("../dataconstants/constants");
var UserRoleTypes = CONSTANTS.UserRoleTypes;
var ModelDataTypes = CONSTANTS.ModelDataTypes;
var auditmanager = require("./../../config/auditmanager");

function generate(parsedCsvDataList, loggedUserData){

    var attributeTypeMapper = {
        'DOB':ModelDataTypes.DATE,
        "parentId":ModelDataTypes.OBJECT_ID,
        "schoolId":ModelDataTypes.OBJECT_ID,
        "_id":ModelDataTypes.OBJECT_ID,
        "createdBy":ModelDataTypes.OBJECT_ID,
        "modifiedBy":ModelDataTypes.OBJECT_ID
    };

    var rowLength = parsedCsvDataList.length;
    var modelAttributes = parsedCsvDataList[0];

    var modelAttributeName2IndexMapper = {};
    _.each(modelAttributes, function(modelAttribute, index){
        modelAttributeName2IndexMapper[modelAttribute] = index;
    });

    return new Promise(function (resolve, reject) {

        async.waterfall([

            function(next){

                var emailIndex = modelAttributeName2IndexMapper["email"];
                var addressIndex = modelAttributeName2IndexMapper["address"];
                var mobileNumberIndex = modelAttributeName2IndexMapper["mobileNumber"];
                var fatherNameIndex = modelAttributeName2IndexMapper["fatherName"];
                var motherNameIndex = modelAttributeName2IndexMapper["motherName"];
                var occupationIndex = modelAttributeName2IndexMapper["occupation"];
                var schoolIdIndex = modelAttributeName2IndexMapper["schoolId"];
                var parentIdIndex = modelAttributeName2IndexMapper["parentId"];
                var parentProfilePictureUrlIndex = modelAttributeName2IndexMapper["parentProfilePictureUrl"];


                var parsedCsvDataArray = parsedCsvDataList.slice(1);
                var emailMobileMapper = {};
                _.each(parsedCsvDataArray, function(data){
                    var key = data[emailIndex]+"_"+data[mobileNumberIndex];
                    var defaultData = {
                        'children':[],
                        'fatherName':data[fatherNameIndex],
                        'motherName':data[motherNameIndex],
                        'mobileNumber':data[mobileNumberIndex],
                        'email':data[emailIndex],
                        'occupation':data[occupationIndex],
                        'schoolId':data[schoolIdIndex],
                        'parentId':data[parentIdIndex],
                        'address':data[addressIndex],
                        'parentProfilePictureUrl':data[parentProfilePictureUrlIndex]
                    };
                    var mappedData = emailMobileMapper[key] || defaultData;
                    mappedData.children.push(data);
                    emailMobileMapper[key] = mappedData;
                });

                next(null, emailMobileMapper);
            },

            function(emailMobileMapper, next){

                var studentUserModelDataList = [];
                _.each(emailMobileMapper, function(mappedData, key){
                    var studentUserModelData = {
                        "name":mappedData.fatherName,
                        "email":mappedData.email,
                        "mobileNumber":mappedData.mobileNumber,
                        "schoolId":mongoose.Types.ObjectId(mappedData.schoolId),
                        "password":"lap123",
                        "profilePictureUrl":mappedData.parentProfilePictureUrl
                    };
                    studentUserModelDataList.push(studentUserModelData);
                });
                User.create(studentUserModelDataList, function(err, data){
                    return next(err, emailMobileMapper, data);
                });
            },

            function(emailMobileMapper, studentParentList, next){

                var studentUserMapper = {};
                _.each(studentParentList, function(studentUserData){
                    studentUserMapper[studentUserData.email+"_"+studentUserData.mobileNumber] = studentUserData;
                });

                return next(null, emailMobileMapper, studentUserMapper);
            },

            function (emailMobileMapper, studentUserMapper, next) {

                var schoolUserRoleModelDataList = [];
                for (var rowIndex = 1; rowIndex < rowLength; rowIndex++) {
                    var csvRowData = parsedCsvDataList[rowIndex];

                    var emailIndex = modelAttributeName2IndexMapper["email"];
                    var mobileNumberIndex = modelAttributeName2IndexMapper["mobileNumber"];
                    var studentUserData = studentUserMapper[csvRowData[emailIndex] + "_" + csvRowData[mobileNumberIndex]];

                    var schoolIdIndex = modelAttributeName2IndexMapper["schoolId"];
                    var schoolId = csvRowData[schoolIdIndex];
                    var rolesIndex = modelAttributeName2IndexMapper["roles"];
                    var roles = csvRowData[rolesIndex];

                    createSchoolUserRolesData(studentUserData, schoolId, roles, schoolUserRoleModelDataList);
                }
                SchoolUserRole.create(schoolUserRoleModelDataList, function(err, schoolUserRoleList){
                    return next(err, emailMobileMapper, studentUserMapper);
                });
            },

            function(emailMobileMapper, parentUserMapper, next){

                var parentModelDataList = [];
                _.each(emailMobileMapper, function(mappedData, key){

                    var parentUserData = parentUserMapper[mappedData.email+"_"+mappedData.mobileNumber];
                    var parentModelData = {
                        "userId":parentUserData._id,
                        "address":mappedData.address,
                        "occupation":mappedData.occupation,
                        "parentProfilePictureUrl":mappedData.parentProfilePictureUrl,
                        "schoolId":mongoose.Types.ObjectId(mappedData.schoolId),
                        "_id":mongoose.Types.ObjectId(mappedData.parentId)
                    };
                    parentModelDataList.push(parentModelData);
                });
                Parent.create(parentModelDataList, next);
            },

            function(parentList, next){

                var studentModelDataList = [];
                var studentFields = ["name","rollNo","admissionNo", "fatherName","motherName",
                    "DOB", "isRegistered", "parentId", "schoolId", "_id", "profilePictureUrl","gender"];
                for (var rowIndex = 1; rowIndex < rowLength; rowIndex++) {
                    var csvRowData = parsedCsvDataList[rowIndex];
                    var modelData = createModelData(studentFields, csvRowData, attributeTypeMapper, modelAttributeName2IndexMapper);
                    //var auditUserData = loggedUserData || {};
                    //auditmanager.populateCreationAudit(loggedUserData, modelData);
                    studentModelDataList.push(modelData);
                }
                Student.create(studentModelDataList, next);
            }

        ], function done(err, studentList){

            if(err) return reject(err);

            console.log("Successfully created student test data");
            return resolve(studentList);
        });
    });
}

////////////// START of private methods //////////////////

function createModelData(requiredModelAttributes, values, attributeTypeMapper, modelAttributeName2IndexMapper) {

    var modelData = {};
    _.each(requiredModelAttributes, function (modelAttribute) {
        var requiredModelAttributeIndex = modelAttributeName2IndexMapper[modelAttribute];
        if(requiredModelAttributeIndex==-1) return; //THIS is for _id field, which is not availavle during csv import
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