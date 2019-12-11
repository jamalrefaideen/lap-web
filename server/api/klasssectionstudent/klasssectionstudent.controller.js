'use strict';

var mongoose = require('mongoose');
var async = require('async');
var _ = require('lodash');
var Promise = require('bluebird');
// set Promise provider to bluebird
mongoose.Promise = Promise;


var Constant = require("../dataconstants/constants");
var Klass = require('../klass/klass.model');
var Student = require('../student/student.model');
var SchoolUserRole = require('../schooluserrole/schooluserrole.model');
var Parent = require('../parent/parent.model');
var User = require('../user/user.model');
var KlassSection = require('../klasssection/klasssection.model');
var KlassSectionStudent = require('./klasssectionstudent.model');
var ChatRoom = require('../chatroom/chatroom.model');
var auditManager = require('../../config/auditmanager');



//inputData:{
// studentData:{"name", "rollNo", "admissionNo", "fatherName", "motherName", "bloodGroup", "DOB"},
// parentData:{"address", "occupation", "motherOccupation", "matchedParentId"},
// primaryUserData:{"name", "email", "mobileNumber", "matchedUserId"},
// secondaryUserData:{"name", "email", "mobileNumber", "matchedUserId"},
// klassId
// klassSectionId
// }
exports.createKlassSectionStudent = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var inputData = req.body;
    var parentData = inputData.parentData;

    if (parentData.matchedParentId) {

        async.waterfall([

            function(next){

                Parent.findById(mongoose.Types.ObjectId(parentData.matchedParentId))
                    .lean()
                    .exec(next);
            },

            function(matchedParentData, next){

                var secondaryUserData = inputData.secondaryUserData;
                if(matchedParentData.secondaryUserId || !secondaryUserData.mobileNumber){
                    return next(null, matchedParentData);
                }

                createSecondaryUserData(loggedUserData, inputData, function(err, secondaryUser){

                    if(err) return next(err);

                    var parentData = inputData.parentData;
                    var query = {'_id':mongoose.Types.ObjectId(parentData.matchedParentId)};
                    var upadteParentData = {
                        'secondaryUserId':secondaryUser._id,
                        'motherOccupation':parentData.motherOccupation
                    };
                    auditManager.populateUpdateAudit(loggedUserData, upadteParentData);
                    Parent.update(query, upadteParentData, function (err) {
                        return next(err, matchedParentData);
                    });
                });
            },

            //Set parent id to student and ceate student
            function (matchedParentData, next) {

                createStudentAndKlassSectionStudent(matchedParentData, inputData, loggedUserData, next);
            }

        ], function(err){

            if (err) {
                return handleError(res, err);
            }

            return res.send(200, 'Success');
        });

    }else{ // here not 'matchedParentId'

        async.waterfall([

            function (next) {

                var primaryUserInputData = inputData.primaryUserInputData;//{name, email, mobileNumber}
                createUserByMobileNumber(loggedUserData, primaryUserInputData, inputData, next);
            },

            function (primaryUser, next) {

                var secondaryUserInputData = inputData.secondaryUserInputData;//{name, email, mobileNumber}
                if (!secondaryUserInputData.mobileNumber) {
                    return next(null, {
                        'primaryUser':primaryUser,
                        'secondaryUser':null
                    });
                }

                createUserByMobileNumber(loggedUserData, secondaryUserInputData, inputData, function (err, secondaryUser) {
                    return next(null, {
                        'primaryUser':primaryUser,
                        'secondaryUser':secondaryUser
                    });
                });
            },

            function(userData, next){
                var parentData = inputData.parentData;//{address, occupation, motherOccupation}
                parentData.userId = userData.primaryUser._id;
                if (userData.secondaryUser) parentData.secondaryUserId = userData.secondaryUser._id;
                auditManager.populateCreationAccountAudit(loggedUserData, parentData);
                Parent.create(parentData, next);
            },

            //Set parent id to student and ceate student
            function (newParentData, next) {
                createStudentAndKlassSectionStudent(newParentData, inputData, loggedUserData, next);
            }

        ], function(err){
            if (err) {
                return handleError(res, err);
            }

            return res.send(200, 'Success');
        });
    }
};




//secondaryUserData:{"_id", "name", "email", "mobileNumber", "matchedUserId"}
function createSecondaryUserData(loggedUserData, inputData, callback){

    //Here if edited secondary-data is matched is some other userId,
    var secondaryUserData = inputData.secondaryUserData;
    if(secondaryUserData.matchedUserId){
        User.findById(mongoose.Types.ObjectId(secondaryUserData.matchedUserId))
            .lean()
            .exec(function(err, matchedSecondaryUser){
                if(err) return callback(err);
                return createUserDependents(matchedSecondaryUser, inputData, loggedUserData, callback);
            });
    }
    //Here if edited secondary-data  does not have its existing data
    else{
        var secondaryUserData = inputData.secondaryUserData;
        var userData = _.pick(secondaryUserData, ["name", "email", "mobileNumber"]);
        userData.password = 'lap123'; //hardcoded
        auditManager.populateCreationAccountAudit(loggedUserData, userData);
        User.create(userData, function(err, newUser){
            if(err) return callback(err);
            return createUserDependents(newUser, inputData, loggedUserData, callback);
        });
    }
}

//inputData:{
// studentData:{"name", "rollNo", "admissionNo", "fatherName", "motherName", "bloodGroup", "DOB"},
// parentData:{"address", "occupation", "motherOccupation", "matchedParentId"},
// primaryUserData:{"name", "email", "mobileNumber", "matchedUserId"},
// secondaryUserData:{"name", "email", "mobileNumber", "matchedUserId"},
// klassId
// klassSectionId
// }
//userInputData:{name, email, mobileNumber}
function createUserByMobileNumber(loggedUserData, userInputData, inputData, callback) {

    async.waterfall([

        function(next){

            var query = {
                'schoolId': loggedUserData.schoolId,
                'mobileNumber': userInputData.mobileNumber,
                'isDeleted':false
            };
            //find user using mobile number to check whether it already exists
            User.findOne(query, function (err, data) {
                if (err || data) { //if exists,no need to create user
                    return next(err, data);
                }

                userInputData.password = 'lap123'; //hardcoded
                auditManager.populateCreationAccountAudit(loggedUserData, userInputData);
                User.create(userInputData, next);
            });
        },

        function(newUser, next){

            createUserDependents(newUser, inputData, loggedUserData, next);
        }

    ], callback);

}


function createUserDependents(userData, inputData, loggedUserData, callback){

    async.waterfall([

        function (next) {

            var query = {
                'userId': userData._id,
                'roleId': Constant.UserRoleTypes.PARENT.roleId,
                'schoolId': loggedUserData.schoolId
            };
            SchoolUserRole.findOne(query)
                .lean()
                .exec(function (err, schoolUserRoleData) {
                    if (err || schoolUserRoleData) return next(err, userData);

                    var schoolRoleSecondaryData = {
                        'userId': userData._id,
                        'roleId': Constant.UserRoleTypes.PARENT.roleId
                    };
                    auditManager.populateCreationAccountAudit(loggedUserData, schoolRoleSecondaryData);
                    SchoolUserRole.create(schoolRoleSecondaryData, function (err) {
                        return next(err, userData);
                    });
                });
        },

        function (userData, next) {

            var chatRoomObj = {
                'userId': userData._id,
                'roomId': mongoose.Types.ObjectId(inputData.klassSectionId),
                'name': inputData.studentData.name
            };
            auditManager.populateCreationAudit(loggedUserData, chatRoomObj);
            ChatRoom.create(chatRoomObj, function (err) {
                return next(err, newUser);
            });
        }

    ], callback);
}


function createStudentAndKlassSectionStudent(parentData, inputData, loggedUserData, callback){

    async.waterfall([

        //Set parent id to student and ceate student
        function (next) {
            //{name, rollNo, admissionNo, fatherName, motherName, DOB, gender}
            var studentData = _.pick(inputData.studentData, ["name", "rollNo", "admissionNo",
                "fatherName", "motherName", "gender"]);
            studentData.DOB = new Date(inputData.studentData.DOB);
            studentData.parentId = parentData._id;
            auditManager.populateCreationAccountAudit(loggedUserData, studentData);
            Student.create(studentData, function(err, studentData){
                return next(err, studentData);
            });
        },

        //create a klass section student record
        function (studentData, next) {
            var klassSectionStudentObj = {
                'klassId': mongoose.Types.ObjectId(inputData.klassId),
                'klassSectionId': mongoose.Types.ObjectId(inputData.klassSectionId),
                'studentId': studentData._id
            };
            auditManager.populateCreationAcademicAccountAudit(loggedUserData, klassSectionStudentObj);
            KlassSectionStudent.create(klassSectionStudentObj,  function(err){
                return next(err, studentData);
            });
        }

    ], callback);
}

exports.getStudentsByKlassSection = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var klassSectionId = req.params.klassSectionId;

    var query = {
        'klassSectionId': klassSectionId,
        'schoolId': loggedUserData.schoolId,
        'isDeleted': false
    };

    KlassSectionStudent.find(query)
        .lean()
        .exec(function (err, klassSectionStudentList) {

            if (err) {
                return handleError(res, err);
            }
            return res.status(200).send(klassSectionStudentList);
        });
};
//resultArray = [{data:[{x:1,y:5}{x:2,y:6}{x:3,y:8}],labels:["5""6""7"]}] -- > x: class name , y : number of students %, labels : %(y value) string
exports.getPrincipalEnrollmentChartDetails = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var resultObj = [];
    var query = {
        'schoolId': loggedUserData.schoolId
    };

    async.waterfall([

        function (next) {

            Klass.find(query)
                .lean()
                .exec(function (err, allKlasses) {
                    return next(err, allKlasses)
                })
        },

        function (allKlasses, next) {
            var sectionStudentQuery = query;
            sectionStudentQuery.isDeleted = false;
            KlassSectionStudent.find(sectionStudentQuery)
                .populate('studentId')
                .lean()
                .exec(function (err, allKlassSectionStudents) {
                    if (err) {
                        return next();
                    }

                    var boyStudents = _.filter(allKlassSectionStudents, function (klassSectionObj) {
                        return klassSectionObj.studentId.gender == "male";
                    });

                    var girlStudents = _.filter(allKlassSectionStudents, function (klassSectionObj) {
                        return klassSectionObj.studentId.gender == "female";
                    });

                    _.each(allKlasses, function (klassObj) {
                        var klassResultObj = {
                            data: [],
                            labels: []
                        };
                        var boysObj = {};
                        var girlsObj = {};
                        var totalObj = {};

                        boysObj.x = klassObj.klassName;
                        boysObj.y = _.filter(boyStudents, function (klassSectionObj) {
                            return klassSectionObj.klassId.toString() == klassObj._id.toString();
                        }).length;

                        klassResultObj.labels.push(boysObj.y.toString() + "%");

                        girlsObj.x = klassObj.klassName;
                        girlsObj.y = _.filter(girlStudents, function (klassSectionObj) {
                            return klassSectionObj.klassId.toString() == klassObj._id.toString();
                        }).length;

                        klassResultObj.labels.push(girlsObj.y.toString() + "%");

                        totalObj.x = klassObj.klassName;
                        totalObj.y = boysObj.y + girlsObj.y;

                        klassResultObj.labels.push(totalObj.y.toString() + "%");

                        klassResultObj.data = [boysObj, girlsObj, totalObj];

                        resultObj.push(klassResultObj);
                    });
                    next();
                })
        }

    ], function (err, data) {
        if (err) {
            return handleError(res, err);
        }

        return res.send(200, resultObj);
    })


};


/*
 inputData:{
 klassId,
 klassSectionId,
 importedData:[
 {rollNo, admissionNo},
 {}, ..
 ],
 }
 */
exports.findKlassSectionStudentsByImportData = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var inputData = req.body;
    var importedDataList = inputData.importedData;

    var resultData = {
        'rollNoMatchedKlassSectionStudentList':[],
        'admissionNoMatchedStudentList':[],
        'mobileNumberMatchedUserList':[]
    };

    async.waterfall([

        function (next) {

            var query = {
                'schoolId': loggedUserData.schoolId,
                'klassId': mongoose.Types.ObjectId(inputData.klassId),
                'klassSectionId': mongoose.Types.ObjectId(inputData.klassSectionId),
                'isDeleted': false
            };
            KlassSectionStudent.find(query)
                .lean()
                .exec(next);
        },

        function (klassSectionStudentList, next) {

            var rollNoList = _.map(importedDataList, "rollNo"); // {'rollNo', 'admissionNo'}
            var studentIdList = _.map(klassSectionStudentList, "studentId");
            var query = {
                'schoolId': loggedUserData.schoolId,
                'rollNo': {$in: rollNoList},
                '_id': {$in: studentIdList},
                'isDeleted': false
            };
            if(rollNoList.length==0){
                return next();
            }

            Student.find(query)
                .lean()
                .exec(function(err, rollNoMatchedKlassSectionStudentList){
                    if(err) return next(err);

                    resultData.rollNoMatchedKlassSectionStudentList = rollNoMatchedKlassSectionStudentList;
                    return next(err);
                });
        },

        function (next) {

            var admissionNoList = _.map(importedDataList, "admissionNo"); // {'rollNo', 'admissionNo'}
            var query = {
                'schoolId': loggedUserData.schoolId,
                'admissionNo': {$in: admissionNoList},
                'isDeleted': false
            };
            if(admissionNoList.length==0){
                return next();
            }

            Student.find(query)
                .lean()
                .exec(function (err, admissionNoMatchedStudentList) {
                    if(err) return next(err);

                    resultData.admissionNoMatchedStudentList = admissionNoMatchedStudentList;
                    return next(err);
                });
        },


        function (next) {

            var mobileNumberList = [];
            _.each(importedDataList, function(data){
                mobileNumberList.push(data.mobileNumber);
                if(data.motherMobileNumber) mobileNumberList.push(data.motherMobileNumber);
            });
            if(mobileNumberList.length==0){
                return next();
            }

            var query = {
                'schoolId': {'$ne':loggedUserData.schoolId},
                'isDeleted':false,
                'mobileNumber': {$in:mobileNumberList}
            };
            User.find(query)
                .lean()
                .exec(function(err, mobileNumberMatchedUserList){
                    if(err) return next(err);

                    resultData.mobileNumberMatchedUserList = mobileNumberMatchedUserList;
                    return next(err);
                });
        }


    ], function done(err) {
        if (err) {
            return handleError(res, err);
        }
        return res.status(200).send(resultData);
    });
};


exports.getEnrollmentStudentsByKlassSection = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var klassSectionId = req.params.klassSectionId;
    var resultData = {
        klassSectionDetails: {},
        klassSectionStudents: []
    };
    
    async.waterfall([

        function (next) {

            KlassSection.findById(klassSectionId)
                .lean()
                .exec(function (err, klassSection) {
                    if (err) {
                        return next(err);
                    }
                    resultData.klassSectionDetails = klassSection;
                    next();
                });
        },

        function (next) {

            var query = {
                'klassSectionId': mongoose.Types.ObjectId(klassSectionId),
                'isDeleted': false
            };
            KlassSectionStudent.find(query)
                .populate('studentId')
                .lean()
                .exec(next);
        },

        function (klassSectionStudentList, next) {

            var parentIdList = _.map(klassSectionStudentList, function (klassSectionStudent) {
                return klassSectionStudent.studentId.parentId;
            });
            var query = {
                'schoolId': loggedUserData.schoolId,
                '_id': {$in: parentIdList}
            };
            Parent.find(query)
                .populate('userId')
                .lean()
                .exec(function (err, parentList) {
                    if (err) {
                        return next(err);
                    }
                    var parentIdMapper = {};
                    _.each(parentList, function(parentData){
                        parentIdMapper[parentData._id] = parentData;
                    });
                    next(err, parentIdMapper, klassSectionStudentList)
                });
        },

        function (parentIdMapper, klassSectionStudentList, next) {

            var klassSectionStudents = _.map(klassSectionStudentList, function (klassSectionStudentObj) {
                var studentData = klassSectionStudentObj.studentId;
                var parentData = parentIdMapper[studentData.parentId];
                var parentUserData = parentData.userId;
                return {
                    name: studentData.name,
                    rollNo: studentData.rollNo,
                    gender: studentData.gender,
                    bloodGroup: studentData.bloodGroup,
                    dob: studentData.DOB,
                    address: parentData.address,
                    fatherName: studentData.fatherName,
                    motherName: studentData.motherName,
                    email: parentUserData.email,
                    motherEmail: '-',
                    mobileNumber: parentUserData.mobileNumber,
                    motherMobileNumber: studentData.motherMobileNumber
                }
            });
            resultData.klassSectionStudents = klassSectionStudents;
            next(null, klassSectionStudents)
        }


    ], function done(err) {

        if (err) {
            return handleError(res, err);
        }

        return res.status(200).send(resultData);
    });
};



//inputData:{klassId, klassSectionId,
// dbData:[{
//      name, rollNo, admissionNo, fatherName, motherName, DOB, gender, bloodGroup, email,
//      mobileNumber, motherMobileNumber, address, occupation, motherOccupation
// }]}
exports.createKlassSectionStudentByBulkOperation = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var inputData = req.body;
    var inputDataList = inputData.dbData;

    async.waterfall([

        function (next) {

            createUserListByBulkOperation(loggedUserData, inputDataList, next);
        },

        function (userDataList, next) {

            var parentInputData = {
                'userDataList': userDataList,
                'loggedUserData': loggedUserData,
                'inputDataList': inputDataList
            };
            createParentListByBulkOperation(parentInputData, function (err, parentDataList) {
                return next(err, userDataList, parentDataList);
            });
        },

        function (userDataList, parentDataList, next) {

            var studentInputData = {
                'userDataList': userDataList,
                'parentDataList': parentDataList,
                'loggedUserData': loggedUserData,
                'inputDataList': inputDataList
            };
            createStudentListByBulkOperation(studentInputData, function(err, studentDataList){
                return next(err, parentDataList, studentDataList);
            });
        },

        function (parentDataList, studentDataList, next) {

            var klassSectionStudentList = _.map(studentDataList, function (studentData) {
                var klassSectionStudentObj = {
                    'klassId': mongoose.Types.ObjectId(inputData.klassId),
                    'klassSectionId': mongoose.Types.ObjectId(inputData.klassSectionId),
                    'studentId': studentData._id
                };
                auditManager.populateCreationAcademicAccountAudit(loggedUserData, klassSectionStudentObj);
                return klassSectionStudentObj;
            });
            KlassSectionStudent.create(klassSectionStudentList, function(err){
                return next(err, parentDataList, studentDataList);
            });
        },

        //create a chat room record
        function (parentDataList, studentDataList, next) {

            var parentIdToStudentDataMapper = {};
            _.each(studentDataList, function (studentData) {
                parentIdToStudentDataMapper[studentData.parentId.toString()] = studentData;
            });

            var chatRoomDataList = [];
            _.each(parentDataList, function(parentData){
                var studentData = parentIdToStudentDataMapper[parentData._id.toString()];
                var userIdList = (parentData.secondaryUserId) ? [parentData.userId, parentData.secondaryUserId] : [parentData.userId];
                _.each(userIdList, function(userId){
                    var chatRoomObj = {
                        'userId': userId,
                        'roomId': mongoose.Types.ObjectId(inputData.klassSectionId),
                        'name': studentData.name
                    };
                    auditManager.populateCreationAudit(loggedUserData, chatRoomObj);
                    chatRoomDataList.push(chatRoomObj);
                });
            });
            ChatRoom.create(chatRoomDataList, next);
        }

    ], function done(err) {

        if (err) {
            return handleError(res, err);
        }
        return res.status(200).send("Success");
    });
};




//inputDataList:[{
//      name, rollNo, admissionNo, fatherName, motherName, DOB, gender, bloodGroup, email,
//      mobileNumber, motherMobileNumber, address, occupation, motherOccupation
// }]
function createUserListByBulkOperation(loggedUserData, inputDataList, callback) {

    async.waterfall([

        function (next) {

            var mobileNumberList = [];
            _.each(inputDataList, function(inputStudentData){
                mobileNumberList.push(inputStudentData.mobileNumber);
                var hasContainsMotherMobileNumber = inputStudentData.motherMobileNumber && ""+inputStudentData.motherMobileNumber.length==10;
                if(hasContainsMotherMobileNumber){
                    mobileNumberList.push(inputStudentData.motherMobileNumber);
                }
            });
            var query = {
                'schoolId': loggedUserData.schoolId,
                'mobileNumber': {$in: mobileNumberList}
            };
            //find user using mobile number to check whether it already exists
            User.find(query)
                .lean()
                .exec(function (err, existingUserList) {

                    if (err) return next(err);

                    var mobileNumberToUserMapper = {};
                    _.each(existingUserList, function (userData) {
                        mobileNumberToUserMapper[userData.mobileNumber] = userData;
                    });
                    return next(err, existingUserList, mobileNumberToUserMapper);
                });
        },

        function (existingUserList, mobileNumberToUserMapper, next) {

            var userInputDataList = [];
            _.each(inputDataList, function (studentInputData) {
                if (!mobileNumberToUserMapper[studentInputData.mobileNumber]){
                    var primaryUserInputData = {
                        'name': studentInputData.fatherName,
                        'email': studentInputData.email,
                        'mobileNumber': studentInputData.mobileNumber,
                        'password': 'lap123'
                    };
                    auditManager.populateCreationAccountAudit(loggedUserData, primaryUserInputData);
                    userInputDataList.push(primaryUserInputData);
                }

                var hasContainsMotherMobileNumber = studentInputData.motherMobileNumber && ""+studentInputData.motherMobileNumber.length==10;
                if(hasContainsMotherMobileNumber && !mobileNumberToUserMapper[studentInputData.motherMobileNumber]){
                    var secondaryUserInputData = {
                        'name': studentInputData.motherName,
                        'email': studentInputData.email,
                        'mobileNumber': studentInputData.motherMobileNumber,
                        'password': 'lap123'
                    };
                    auditManager.populateCreationAccountAudit(loggedUserData, secondaryUserInputData);
                    userInputDataList.push(secondaryUserInputData);
                }
            });

            if(userInputDataList.length==0){
                return next(null, existingUserList, []);
            }

            User.create(userInputDataList, function (err, newlyCreatedUserList) {
                return next(err, existingUserList, newlyCreatedUserList);
            });
        },

        function (existingUserList, newlyCreatedUserList, next) {

            var schoolUserRoleQuery = {
                'userId': {$in:_.map(existingUserList,'_id')},
                'roleId': Constant.UserRoleTypes.PARENT.roleId
            };
            SchoolUserRole.find(schoolUserRoleQuery)
                .lean()
                .exec(function (err, schoolUserRoleList) {
                    if(err) return next(err);

                    var userIdToSchoolUserParentRoleMapper = {};
                    _.each(schoolUserRoleList, function(schoolUserParentRoleData){
                        userIdToSchoolUserParentRoleMapper[schoolUserParentRoleData.userId.toString()] = schoolUserParentRoleData;
                    });
                    return next(err, existingUserList, newlyCreatedUserList, userIdToSchoolUserParentRoleMapper);
            });
        },

        function (existingUserList, newlyCreatedUserList, userIdToSchoolUserParentRoleMapper, next) {

            var schoolRoleDataList = [];
            var totalUserList = _.compact(existingUserList.concat(newlyCreatedUserList));
            _.each(totalUserList, function(userData){
                var schoolUserParentRoleData = userIdToSchoolUserParentRoleMapper[userData._id];
                if(schoolUserParentRoleData){
                   return;
                }

                var schoolRoleData = {
                    'userId': userData._id,
                    'roleId': Constant.UserRoleTypes.PARENT.roleId
                };
                auditManager.populateCreationAccountAudit(loggedUserData, schoolRoleData);
                schoolRoleDataList.push(schoolRoleData);
            });
            if(schoolRoleDataList.length==0){
                return next(null, totalUserList);
            }

            SchoolUserRole.create(schoolRoleDataList, function (err) {
                return next(err, totalUserList);
            });
        }

    ], callback);
}


//inputDataList:[{
//      name, rollNo, admissionNo, fatherName, motherName, DOB, gender, bloodGroup, email,
//      mobileNumber, motherMobileNumber, address, occupation, motherOccupation
// }]
function createParentListByBulkOperation(parentInputData, callback) {

    var loggedUserData = parentInputData.loggedUserData,
        inputDataList = parentInputData.inputDataList,
        userDataList = parentInputData.userDataList;

    async.waterfall([

        function (next) {

            var userIdList = _.map(userDataList, "_id");
            var query = {
                'schoolId': loggedUserData.schoolId,
                'userId': {$in: userIdList}
            };
            //find user using mobile number to check whether it already exists
            Parent.find(query)
                .lean()
                .exec(function (err, alreadySavedParentList) {

                    if (err) return next(err);

                    var savedUserId2MobileNumberMapper = {},
                        userMobileNo2UserIdMapper = {};
                    _.each(userDataList, function (user) {
                        savedUserId2MobileNumberMapper[user._id] = user.mobileNumber;
                        userMobileNo2UserIdMapper[user.mobileNumber] = user._id;
                    });

                    var userMobileNo2ParentMapper = {};
                    _.each(alreadySavedParentList, function (parent) {
                        var mobileNumber = savedUserId2MobileNumberMapper[parent.userId];
                        userMobileNo2ParentMapper[mobileNumber] = parent;
                    });
                    return next(err, alreadySavedParentList, userMobileNo2ParentMapper, userMobileNo2UserIdMapper);
                });
        },

        function (alreadySavedParentList, userMobileNo2ParentMapper, userMobileNo2UserIdMapper, next) {

            var newParentDataList = [],
                updateParentDataList = [];
            _.each(inputDataList, function (studentInputData) {
                var savedParentData = userMobileNo2ParentMapper[studentInputData.mobileNumber];
                var secondaryUserId = userMobileNo2UserIdMapper[studentInputData.motherMobileNumber];
                if(!savedParentData){
                    var parentData = {
                        'userId': userMobileNo2UserIdMapper[studentInputData.mobileNumber],
                        'address': studentInputData.address,
                        'occupation': studentInputData.occupation,
                        'motherOccupation': studentInputData.motherOccupation
                    };
                    if(secondaryUserId) parentData.secondaryUserId = secondaryUserId;
                    auditManager.populateCreationAccountAudit(loggedUserData, parentData);
                    newParentDataList.push(parentData);
                }else if (savedParentData && !savedParentData.secondaryUserId && secondaryUserId) {
                    var upadteParentData = {
                        '_id':savedParentData._id,
                        'secondaryUserId':secondaryUserId,
                        'motherOccupation': studentInputData.motherOccupation
                    };
                    auditManager.populateUpdateAudit(loggedUserData, upadteParentData);
                    updateParentDataList.push(upadteParentData);
                }
            });

            if(newParentDataList.length==0) {
                return next(null, updateParentDataList, alreadySavedParentList);
            }
            Parent.create(newParentDataList, function (err, newlyCreatedParentList) {

                if(err) return next(err);

                var totalParentList = (alreadySavedParentList.length) ? alreadySavedParentList.concat(newlyCreatedParentList) : newlyCreatedParentList;
                return next(err, updateParentDataList, totalParentList);
            });
        },

        function(updateParentDataList, totalParentList, next){

            if(updateParentDataList.length==0) {
                return next(null, totalParentList);
            }

            var batch = Parent.collection.initializeUnorderedBulkOp();
            _.each(updateParentDataList, function (parentUpdateData) {
                var query = {'_id':mongoose.Types.ObjectId(parentUpdateData._id)};
                delete parentUpdateData._id;

                batch.find(query)
                    .upsert(true)
                    .updateOne({$set: parentUpdateData});
            });

            batch.execute(function (err, result) {
                return next(err, totalParentList);
            });
        }

    ], callback);
}


//inputDataList:[{
//      name, rollNo, admissionNo, fatherName, motherName, DOB, gender, bloodGroup, email,
//      mobileNumber, motherMobileNumber, address, occupation, motherOccupation
// }]
function createStudentListByBulkOperation(studentInputData, callback) {

    var userDataList = studentInputData.userDataList;
    var parentDataList = studentInputData.parentDataList;
    var loggedUserData = studentInputData.loggedUserData;
    var inputDataList = studentInputData.inputDataList;

    var userIdToMobileNumberMapper = {};
    _.each(userDataList, function (user) {
        userIdToMobileNumberMapper[user._id] = user.mobileNumber;
    });

    var userMobileNo2ParentMapper = {};
    _.each(parentDataList, function (parentData) {
        var mobileNumber = userIdToMobileNumberMapper[parentData.userId];
        userMobileNo2ParentMapper[mobileNumber] = parentData;
    });


    var studentDataList = _.map(inputDataList, function (inputData) {
        var studentData = {
            'name': inputData.name,
            'rollNo': inputData.rollNo,
            'admissionNo': inputData.admissionNo,
            'fatherName': inputData.fatherName,
            'motherName': inputData.motherName,
            'DOB': new Date(inputData.DOB),
            'gender': inputData.gender,
            'bloodGroup': inputData.bloodGroup
        };
        var parentData = userMobileNo2ParentMapper[inputData.mobileNumber];
        studentData.parentId = parentData._id;
        auditManager.populateCreationAccountAudit(loggedUserData, studentData);
        return studentData;
    });
    Student.create(studentDataList, callback);
}


function handleError(res, err) {
    return res.status(500).send(err);
}