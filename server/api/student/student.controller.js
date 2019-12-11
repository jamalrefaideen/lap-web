'use strict';

var async = require("async");
var _ = require("lodash");
var mongoose = require('mongoose');
var Promise = require('bluebird');
// set Promise provider to bluebird
var auditManager = require('../../config/auditmanager');
mongoose.Promise = Promise;


var Constant = require('../dataconstants/constants');
var Student = require('./student.model');
var Parent = require("../parent/parent.model");
var SchoolUserRole = require("../schooluserrole/schooluserrole.model");
var User = require('../user/user.model');
var Klass = require("../klass/klass.model");
var KlassSection = require("../klasssection/klasssection.model");
var KlassSectionStudent = require("../klasssectionstudent/klasssectionstudent.model");
var ChatRoom = require('../chatroom/chatroom.model');


exports.getStudentsByParent = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var userId = loggedUserData.userId;
    var schoolId = loggedUserData.schoolId;

    async.waterfall([

            function (next) {

                var query = {
                    'schoolId': schoolId,
                    $or: [
                        {'userId': mongoose.Types.ObjectId(userId)},
                        {'secondaryUserId': mongoose.Types.ObjectId(userId)}
                    ]
                };
                Parent.findOne(query)
                    .lean()
                    .then(next);
            },

            function (parentData, next) {

                var query = {
                    'schoolId': schoolId,
                    'parentId': parentData._id,
                    'isDeleted': false
                };

                Student.find(query)
                    .lean()
                    .exec(next);
            }
        ],

        function done(err, studentList) {

            if (err) {
                return handleError(res, err)
            }

            return res.status(200).send(studentList);
        });
};


exports.getSectionStudentList = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;

    async.waterfall([

        function (next) {

            var query = {
                'schoolId': schoolId,
                'klassId': mongoose.Types.ObjectId(req.params.klassId),
                'klassSectionId': mongoose.Types.ObjectId(req.params.klassSectionId),
                'isDeleted': false
            };

            KlassSectionStudent.find(query)
                .lean()
                .exec(next);
        },

        function (klassSectionStudentList, next) {

            var studentIdList = _.map(klassSectionStudentList, 'studentId');
            var query = {
                'schoolId': schoolId,
                '_id': {$in: studentIdList},
                'isDeleted': false
            };

            Student.find(query)
                .populate('parentId')
                .lean()
                .exec(next);
        },

        function (studentList, next) {
            Student.populate(studentList, {
                path: 'parentId.userId',
                model: 'User'
            }, next);
        },

        function (studentList, next) {

            var query = {
                'schoolId': schoolId,
                '_id': mongoose.Types.ObjectId(req.params.klassId)
            };
            Klass.findOne(query)
                .lean()
                .exec(function (err, klassData) {
                    return next(err, studentList, klassData);
                });
        },

        function (studentList, klassData, next) {

            var query = {
                'schoolId': schoolId,
                '_id': mongoose.Types.ObjectId(req.params.klassSectionId)
            };
            KlassSection.findOne(query)
                .lean()
                .exec(function (err, klassSectionData) {
                    return next(err, studentList, klassData, klassSectionData);
                });
        }


    ], function done(err, studentList, klassData, klassSectionData) {

        if (err) {
            return handleError(res, err)
        }

        var resultData = {
            'studentList': studentList,
            'klassData': klassData,
            'klassSectionData': klassSectionData
        };
        return res.status(200).send(resultData);
    });
};


exports.getKlassStudentList = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;

    async.waterfall([

        function (next) {

            var query = {
                'schoolId': schoolId,
                'klassId': mongoose.Types.ObjectId(req.params.klassId),
                'isDeleted': false
            };

            if (req.params.klassSectionId) {
                query.klassSectionId = mongoose.Types.ObjectId(req.params.klassSectionId)
            }
            KlassSectionStudent.find(query)
                .lean()
                .exec(next);
        },

        function (klassSectionStudentList, next) {

            var studentIdList = _.map(klassSectionStudentList, 'studentId');
            var query = {
                'schoolId': schoolId,
                '_id': {$in: studentIdList},
                'isDeleted': false
            };

            Student.find(query)
                .populate('parentId')
                .lean()
                .exec(next);
        },

        function (studentList, next) {
            Student.populate(studentList, {
                path: 'parentId.userId',
                model: 'User'
            }, next);
        }


    ], function done(err, studentList) {

        if (err) {
            return handleError(res, err)
        }

        var resultData = {
            'studentList': studentList
        };
        return res.status(200).send(resultData);
    });
};


exports.getStudentByRollNumber = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var paramData = req.params;

    async.waterfall([

        function (next) {

            var query = {
                'schoolId': loggedUserData.schoolId,
                'klassId': mongoose.Types.ObjectId(paramData.klassId),
                'klassSectionId': mongoose.Types.ObjectId(paramData.klassSectionId),
                'isDeleted': false
            };
            KlassSectionStudent.find(query)
                .lean()
                .exec(next);
        },

        function (klassSectionStudentList, next) {

            var studentIdList = _.map(klassSectionStudentList, "studentId");
            var query = {
                'schoolId': schoolId,
                'rollNo': paramData.rollNumber,
                '_id': {$in: studentIdList},
                'isDeleted': false
            };
            Student.find(query)
                .lean()
                .exec(next);
        }


    ], function done(err, studentList) {

        if (err) {
            return handleError(res, err)
        }

        return res.status(200).send(studentList);
    });
};


exports.getStudentByAdmissionNumber = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var admissionNumber = req.params.admissionNumber;

    var query = {
        'schoolId': schoolId,
        'admissionNo': admissionNumber,
        'isDeleted': false
    };
    Student.find(query)
        .lean()
        .exec(function (err, studentList) {

            if (err) {
                return handleError(res, err)
            }

            return res.status(200).send(studentList);
        });
};


exports.getStudentListByGender = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var gender = req.params.gender;

    var query = {
        'schoolId': schoolId,
        'gender': gender,
        'isDeleted': false
    };
    Student.find(query)
        .lean()
        .exec(function (err, studentGenderList) {

            if (err) {
                return handleError(res, err)
            }

            return res.status(200).send(studentGenderList);
        });
};


// input = studentId
// output   = {
//              'name' 'rollNo', 'admissionNo', 'fatherName', 'motherName',
//              'gender' 'DOB', 'profilePictureUrl', 'bloodGroup',
//              'email', 'mobileNumber','address', 'occupation'
//              }
exports.getStudentEnrollmentData = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var studentId = req.params.studentId;

    async.waterfall([

        function (next) {

            var query = {
                'schoolId': schoolId,
                '_id': studentId
            };
            Student.findOne(query)
                .lean()
                .exec(next);
        },

        function (studentData, next) {

            var query = {
                'schoolId': schoolId,
                '_id': mongoose.Types.ObjectId(studentData.parentId)
            };
            Parent.findOne(query)
                .lean()
                .populate("userId")
                .exec(function (err, parentData) {
                    return next(err, studentData, parentData);
                });
        },

        function (studentData, parentData, next) {

            var parentUserData = parentData.userId;
            var enrollmentData = {
                'name': studentData.name,
                'rollNo': studentData.rollNo,
                'admissionNo': studentData.admissionNo,
                'fatherName': studentData.fatherName,
                'motherName': studentData.motherName,
                'gender': studentData.gender,
                'DOB': new Date(studentData.DOB),
                'profilePictureUrl': "",
                'bloodGroup': studentData.bloodGroup,
                'email': parentUserData.email,
                'mobileNumber': parentUserData.mobileNumber,
                'address': parentData.address,
                'occupation': parentData.occupation
            };
            return next(null, enrollmentData);
        }

    ], function (err, enrollmentData) {

        if (err) {
            return handleError(res, err)
        }

        return res.status(200).send(enrollmentData);
    });
};


exports.getStudentObj = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var studentId = mongoose.Types.ObjectId(req.params.studentId);

    var resultData = {
        'studentData': null,
        'parentData': null,
        'primaryUserData': null,
        'secondaryUserData': null,
        'klassId': null,
        'klassSectionId': null,
        'klassSectionName': null
    };

    async.waterfall([

        function (next) {

            var query = {
                'schoolId': schoolId,
                '_id': studentId
            };
            Student.findOne(query)
                .lean()
                .exec(function (err, studentData) {
                    if (err) {
                        return next(err);
                    }
                    resultData.studentData = studentData;
                    next(err, studentData);
                });
        },

        function (studentData, next) {

            var query = {
                'schoolId': schoolId,
                '_id': mongoose.Types.ObjectId(studentData.parentId)
            };
            Parent.findOne(query)
                .lean()
                .exec(function (err, parentData) {
                    if (err) {
                        return next(err);
                    }
                    resultData.parentData = parentData;
                    next(err, parentData);
                });
        },

        function (parentData, next) {

            var query = {
                'schoolId': schoolId,
                '_id': mongoose.Types.ObjectId(parentData.userId)
            };
            User.findOne(query)
                .lean()
                .exec(function (err, userData) {
                    if (err) {
                        return next(err);
                    }
                    resultData.primaryUserData = userData;
                    next(err, parentData);
                });
        },

        function (parentData, next) {

            if (!parentData.secondaryUserId) {
                return next();
            }

            var query = {
                'schoolId': schoolId,
                '_id': mongoose.Types.ObjectId(parentData.secondaryUserId)
            };
            User.findOne(query)
                .lean()
                .exec(function (err, userData) {
                    if (err) {
                        return next(err);
                    }
                    resultData.secondaryUserData = userData;
                    next();
                });
        },

        function (next) {

            var query = {
                'schoolId': schoolId,
                'studentId': studentId
            };
            KlassSectionStudent.findOne(query)
                .populate("klassSectionId")
                .lean()
                .exec(function (err, klassStudent) {
                    if (err) {
                        return next(err);
                    }
                    resultData.klassId = klassStudent.klassId;
                    resultData.klassSectionId = klassStudent.klassSectionId._id;
                    resultData.klassSectionName = klassStudent.klassSectionId.klassSectionName;
                    next();
                });
        }
    ], function (err, data) {
        if (err) {
            return handleError(res, err)
        }

        return res.send(200, resultData);
    });
};




exports.updateStudentDelete = function (req, res) {

    var loggedUserData = req.loggedUserData;
    async.waterfall([

        function (next) {

            var studentId = mongoose.Types.ObjectId(req.params.studentId);
            Student.findById(studentId)
                .populate("parentId")
                .lean()
                .exec(next);
        },

        function (studentData, next) {

            var query = {
                '_id': mongoose.Types.ObjectId(req.params.studentId),
                'schoolId': loggedUserData.schoolId
            };
            var updateData = {isDeleted: true};
            auditManager.populateUpdateAudit(loggedUserData, updateData);

            Student.update(query, {$set: updateData}, function (err, data) {
                return next(err, studentData);
            });
        },

        function (studentData, next) {

            var query = {
                'studentId': mongoose.Types.ObjectId(req.params.studentId),
                'schoolId': loggedUserData.schoolId
            };
            var updateData = {isDeleted: true};
            auditManager.populateUpdateAudit(loggedUserData, updateData);

            KlassSectionStudent.update(query, {$set: updateData}, function (err, data) {
                return next(err, studentData);
            });
        },

        function (studentData, next) {

            var parentData = studentData.parentId;
            var query = {
                'schoolId': loggedUserData.schoolId,
                'parentId': parentData._id,
                'isDeleted': false
            };
            Student.count(query, function (err, studentCount) {
                return next(err, studentData, {count: studentCount});
            });
        },


        function (studentData, studentCountData, next) {

            if (studentCountData.count != 0) {
                return next(null, studentData);
            }

            var parentData = studentData.parentId;
            var UserRoleTypes = Constant.UserRoleTypes;
            var removeQuery = {
                'roleId': UserRoleTypes.PARENT.roleId,
                'userId': mongoose.Types.ObjectId(parentData.userId),
                'schoolId': loggedUserData.schoolId
            };

            if (parentData.secondaryUserId) {
                removeQuery.userId = {
                    $in: [
                        mongoose.Types.ObjectId(parentData.userId),
                        mongoose.Types.ObjectId(parentData.secondaryUserId)
                    ]
                };
            }

            SchoolUserRole.remove(removeQuery, function (err, data) {
                return next(err, studentData);
            });
        },

        //Here check the primaryUserData
        function (studentData, next) {

            var parentData = studentData.parentId;
            var query = {
                'userId': mongoose.Types.ObjectId(parentData.userId),
                'schoolId': loggedUserData.schoolId
            };
            SchoolUserRole.count(query, function (err, userRoleCount) {

                if (err || userRoleCount != 0) {
                    return next(null, studentData);
                }

                var query = {
                    '_id': mongoose.Types.ObjectId(parentData.userId),
                    'schoolId': loggedUserData.schoolId
                };
                var updateData = {isDeleted: true};
                auditManager.populateUpdateAudit(loggedUserData, updateData);
                User.update(query, {$set: updateData}, function (err, data) {
                    return next(err, studentData);
                });
            });
        },

        //Here check the secondaryUserData
        function (studentData, next) {

            var parentData = studentData.parentId;
            if (!parentData.secondaryUserId) {
                return next();
            }

            var query = {
                'userId': mongoose.Types.ObjectId(parentData.secondaryUserId),
                'schoolId': loggedUserData.schoolId
            };
            SchoolUserRole.count(query, function (err, userRoleCount) {

                if (err || userRoleCount != 0) {
                    return next(null, studentData);
                }

                var query = {
                    '_id': mongoose.Types.ObjectId(parentData.secondaryUserId),
                    'schoolId': loggedUserData.schoolId
                };
                var updateData = {isDeleted: true};
                auditManager.populateUpdateAudit(loggedUserData, updateData);
                User.update(query, {$set: updateData}, function (err, data) {
                    return next(err);
                });
            });
        }

    ], function done(err) {

        if (err) {
            return handleError(res, err)
        }

        return res.status(200).send('Success');
    });
};




///////////// START of Student-Edit-Details ////////////////

//studentInputData:{
// studentData:{"_id", "name", "rollNo", "admissionNo", "fatherName", "motherName", "bloodGroup", "DOB"},
// parentData:{"_id", "address", "occupation", "motherOccupation", "matchedParentId"},
// primaryUserData:{"_id", "name", "email", "mobileNumber", "matchedUserId"},
// secondaryUserData:{"_id", "name", "email", "mobileNumber", "matchedUserId"},
// klassSectionId
// }
exports.updateEditStudentDetails = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var studentInputData = req.body;

    async.waterfall([

        function (next) {

            updateParentUserData(loggedUserData, studentInputData, next);
        },


        function (updatedParentData, next) {

            var studentData = studentInputData.studentData;
            var query = {'_id': mongoose.Types.ObjectId(studentData._id)};
            delete studentData._id;
            studentData.DOB = new Date(studentData.DOB);
            studentData.parentId = mongoose.Types.ObjectId(updatedParentData._id);
            auditManager.populateUpdateAudit(loggedUserData, studentData);

            Student.update(query, {$set: studentData}, function (err, data) {
                return next(err);
            });
        }

    ], function (err) {

        if (err) {
            return handleError(res, err)
        }

        return res.send(200, 'Successfully updated student data');
    });
};




//inputData:{
// studentData:{"_id", "name", "rollNo", "admissionNo", "fatherName", "motherName", "bloodGroup", "DOB"},
// parentData:{"_id", "address", "occupation", "motherOccupation", "matchedParentId"},
// primaryUserData:{"_id", "name", "email", "mobileNumber", "matchedUserId"},
// secondaryUserData:{"_id", "name", "email", "mobileNumber", "matchedUserId"},
// klassSectionId
// }
function updateParentUserData(loggedUserData, inputData, callback){

    var parentData = inputData.parentData;
    if (parentData.matchedParentId) {

        replaceParentDataWithMatchedParentId(loggedUserData, inputData, callback);

    }else{ // here not 'matchedParentId'

        async.waterfall([

            function(next){

                updatePrimaryUserData(loggedUserData, inputData, next);
            },

            function(updatedPrimaryUserData, next){

                updateSecondaryUserData(loggedUserData, inputData, function(err, updatedSecondaryUserData){
                    if(err) return next(err);

                    var updatedUserData = {
                        'updatedPrimaryUserData':updatedPrimaryUserData,
                        'updatedSecondaryUserData':updatedSecondaryUserData
                    };
                    return next(err, updatedUserData);
                });
            },

            // parentData:{"_id", "address", "occupation", "motherOccupation", "matchedParentId"},
            function(updatedUserData, next){

                var updatedPrimaryUserData = updatedUserData.updatedPrimaryUserData,
                    updatedSecondaryUserData = updatedUserData.updatedSecondaryUserData;

                var parentData = inputData.parentData;
                var query = {'_id': mongoose.Types.ObjectId(parentData._id)};
                var updateData = _.pick(parentData, ["address", "occupation", "motherOccupation"]);
                updateData.userId = mongoose.Types.ObjectId(updatedPrimaryUserData._id);
                if(updatedSecondaryUserData){
                    updateData.secondayUserId = mongoose.Types.ObjectId(updatedSecondaryUserData._id);
                }
                auditManager.populateUpdateAudit(loggedUserData, updateData);
                Parent.update(query, {$set: updateData}, function (err, data) {
                    return next(err);
                });
            },

            function(next){

                Parent.findById(mongoose.Types.ObjectId(parentData._id))
                    .lean()
                    .exec(next);
            }

        ], callback);
    }
}


function replaceParentDataWithMatchedParentId(loggedUserData, inputData, callback){

    var parentData = inputData.parentData;

    async.waterfall([

        function(next){

            Parent.findById(mongoose.Types.ObjectId(parentData._id))
                .lean()
                .exec(next);
        },

        function (oldParentData, next) {

            var query = {
                'schoolId': loggedUserData.schoolId,
                'isDeleted': false,
                'parentId': oldParentData._id,
                '_id':{$ne:mongoose.Types.ObjectId(inputData.studentData._id)}
            };
            Student.count(query, function (err, studentCount) {
                return next(err, oldParentData, {count: studentCount});
            });
        },


        function (oldParentData, studentCountData, next) {

            if (studentCountData.count != 0) {
                return next(null, oldParentData);
            }


            var UserRoleTypes = Constants.UserRoleTypes;
            var deleteInputData = {
                'roleId': UserRoleTypes.PARENT.roleId,
                'userId': mongoose.Types.ObjectId(oldParentData.userId),
                'loggedUserData': loggedUserData
            };
            SchoolUserRole.removeDependents(deleteInputData, function (err, data) {
                if(err) return next(err);

                var chatRoomRemoveQuery = {
                    'userId': oldParentData.userId,
                    'roomId': mongoose.Types.ObjectId(inputData.klassSectionId)
                };
                ChatRoom.remove(chatRoomRemoveQuery, function (err) {
                    return next(err, oldParentData, studentCountData);
                });
            });
        },

        function (oldParentData, studentCountData, next) {

            if (studentCountData.count != 0) {
                return next(null, oldParentData);
            }

            if (!oldParentData.secondaryUserId) {
                return next(null, oldParentData);
            }


            var UserRoleTypes = Constants.UserRoleTypes;
            var deleteInputData = {
                'roleId': UserRoleTypes.PARENT.roleId,
                'userId': mongoose.Types.ObjectId(oldParentData.secondaryUserId),
                'loggedUserData': loggedUserData
            };
            SchoolUserRole.removeDependents(deleteInputData, function (err, data) {
                if(err) return next(err);

                var chatRoomRemoveQuery = {
                    'userId': oldParentData.secondaryUserId,
                    'roomId': mongoose.Types.ObjectId(inputData.klassSectionId)
                };
                ChatRoom.remove(chatRoomRemoveQuery, function (err) {
                    return next(err, oldParentData);
                });
            });
        },

        function (oldParentData, next) {

            Parent.findById(mongoose.Types.ObjectId(parentData.matchedParentId))
                .lean()
                .exec(next);
        }

    ], callback);
}

//primaryUserData:{"_id", "name", "email", "mobileNumber", "matchedUserId"}
function updatePrimaryUserData(loggedUserData, inputData, callback){

    var primaryUserData = inputData.primaryUserData;
    if(primaryUserData.matchedUserId){

        async.waterfall([

            function(next){

                var UserRoleTypes = Constants.UserRoleTypes;
                var deleteInputData = {
                    'roleId': UserRoleTypes.PARENT.roleId,
                    'userId': mongoose.Types.ObjectId(primaryUserData._id),
                    'loggedUserData': loggedUserData
                };
                SchoolUserRole.removeDependents(deleteInputData, function (err, data) {
                    if(err) return next(err);

                    var chatRoomRemoveQuery = {
                        'userId': primaryUserData._id,
                        'roomId': mongoose.Types.ObjectId(inputData.klassSectionId)
                    };
                    ChatRoom.remove(chatRoomRemoveQuery, function (err) {
                        return next(err);
                    });
                });
            },

            function(next){

                User.findById(mongoose.Types.ObjectId(primaryUserData.matchedUserId))
                    .lean()
                    .exec(next);
            },

            function (matchedPrimaryUser, next) {

                var query = {
                    'userId': matchedPrimaryUser._id,
                    'roleId': Constant.UserRoleTypes.PARENT.roleId,
                    'schoolId': loggedUserData.schoolId
                };
                SchoolUserRole.findOne(query)
                    .lean()
                    .exec(function (err, schoolUserRoleData) {
                        if (err || schoolUserRoleData) return next(err, matchedPrimaryUser);

                        var schoolRoleSecondaryData = {
                            'userId': matchedPrimaryUser._id,
                            'roleId': Constant.UserRoleTypes.PARENT.roleId
                        };
                        auditManager.populateCreationAccountAudit(loggedUserData, schoolRoleSecondaryData);
                        SchoolUserRole.create(schoolRoleSecondaryData, function (err) {
                            return next(err, matchedPrimaryUser);
                        });
                    });
            },

            function (matchedPrimaryUser, next) {

                var chatRoomObj = {
                    'userId': matchedPrimaryUser._id,
                    'roomId': mongoose.Types.ObjectId(inputData.klassSectionId),
                    'name': inputData.studentData.name
                };
                auditManager.populateCreationAudit(loggedUserData, chatRoomObj);
                ChatRoom.create(chatRoomObj, function (err) {
                    return next(err, matchedPrimaryUser);
                });
            }

        ], callback);

    }else{ //here not matchedUserId

        async.waterfall([

            function(next){

                var query = {'_id': mongoose.Types.ObjectId(primaryUserData._id)};
                var updateData = _.pick(primaryUserData, ["name", "email", "mobileNumber"]);
                auditManager.populateUpdateAudit(loggedUserData, updateData);
                User.update(query, {$set: updateData}, function (err, data) {
                    return next(err);
                });
            },

            function(next){

                User.findById(mongoose.Types.ObjectId(primaryUserData._id))
                    .lean()
                    .exec(next);
            }

        ], callback);
    }
}


//secondaryUserData:{"_id", "name", "email", "mobileNumber", "matchedUserId"}
function updateSecondaryUserData(loggedUserData, inputData, callback){

    var secondaryUserData = inputData.secondaryUserData;

    //Here if edited secondary-data is matched is some other userId,
    //Have to remove the already existing secondaryUser and its dependents and return the matchedUserId data
    if(secondaryUserData.matchedUserId){

        async.waterfall([

            function(next){

                if(!secondaryUserData._id){
                    return next();
                }

                var UserRoleTypes = Constants.UserRoleTypes;
                var deleteInputData = {
                    'roleId': UserRoleTypes.PARENT.roleId,
                    'userId': mongoose.Types.ObjectId(secondaryUserData._id),
                    'loggedUserData': loggedUserData
                };
                SchoolUserRole.removeDependents(deleteInputData, function (err, data) {
                    if(err) return next(err);

                    var chatRoomRemoveQuery = {
                        'userId': secondaryUserData._id,
                        'roomId': mongoose.Types.ObjectId(inputData.klassSectionId)
                    };
                    ChatRoom.remove(chatRoomRemoveQuery, function (err) {
                        return next(err);
                    });
                });
            },

            function(next){

                User.findById(mongoose.Types.ObjectId(secondaryUserData.matchedUserId))
                    .lean()
                    .exec(next);
            },

            function (matchedSecondaryUser, next) {

                var query = {
                    'userId': matchedSecondaryUser._id,
                    'roleId': Constant.UserRoleTypes.PARENT.roleId,
                    'schoolId': loggedUserData.schoolId
                };
                SchoolUserRole.findOne(query)
                    .lean()
                    .exec(function (err, schoolUserRoleData) {
                        if (err || schoolUserRoleData) return next(err, matchedSecondaryUser);

                        var schoolRoleSecondaryData = {
                            'userId': matchedSecondaryUser._id,
                            'roleId': Constant.UserRoleTypes.PARENT.roleId
                        };
                        auditManager.populateCreationAccountAudit(loggedUserData, schoolRoleSecondaryData);
                        SchoolUserRole.create(schoolRoleSecondaryData, function (err) {
                            return next(err, matchedSecondaryUser);
                        });
                    });
            },

            function (matchedSecondaryUser, next) {

                var chatRoomObj = {
                    'userId': matchedSecondaryUser._id,
                    'roomId': mongoose.Types.ObjectId(inputData.klassSectionId),
                    'name': inputData.studentData.name
                };
                auditManager.populateCreationAudit(loggedUserData, chatRoomObj);
                ChatRoom.create(chatRoomObj, function (err) {
                    return next(err, matchedSecondaryUser);
                });
            }

        ], callback);

    }

    //Here if edited secondary-data is not matched with other userId and also has its existing data,
    //Have to update the existing secondaryUser return the existing secondaryUser data
    else if(!secondaryUserData.matchedUserId && secondaryUserData._id){ //here not matchedUserId

        async.waterfall([

            function(next){

                var query = {'_id': mongoose.Types.ObjectId(secondaryUserData._id)};
                var updateData = _.pick(secondaryUserData, ["name", "email", "mobileNumber"]);
                auditManager.populateUpdateAudit(loggedUserData, updateData);
                User.update(query, {$set: updateData}, function (err, data) {
                    return next(err);
                });
            },

            function(next){

                User.findById(mongoose.Types.ObjectId(secondaryUserData._id))
                    .lean()
                    .exec(next);
            }

        ], callback);

    }

    //Here if edited secondary-data is not matched with other userId and it does not have its existing data,
    //Have to create secondaryUser and its dependents return the newly created secondaryUser data
    else if(!secondaryUserData._id && secondaryUserData.mobileNumber){

        createSecondaryUserData(loggedUserData, secondaryUserData, callback);
    }

    //Here if edited secondary-data is not matched with other userId and it does not have its existing data
    // and also not having data to create then sinply return empy
    else{

        return callback();
    }
}



//secondaryUserData:{"_id", "name", "email", "mobileNumber", "matchedUserId"}
function createSecondaryUserData(loggedUserData, inputData, callback) {

    var secondaryUserData = inputData.secondaryUserData;
    async.waterfall([

        function (next) {
            var userData = _.pick(secondaryUserData, ["name", "email", "mobileNumber"]);
            userData.password = 'lap123'; //hardcoded
            auditManager.populateCreationAccountAudit(loggedUserData, userData);
            User.create(userData, next);
        },

        function (newSecondaryUser, next) {

            var schoolRoleSecondaryData = {
                'userId': newSecondaryUser._id,
                'roleId': Constant.UserRoleTypes.PARENT.roleId
            };
            auditManager.populateCreationAccountAudit(loggedUserData, schoolRoleSecondaryData);
            SchoolUserRole.create(schoolRoleSecondaryData, function (err) {
                return next(err, newSecondaryUser);
            });
        },

        function (newSecondaryUser, next) {

            var chatRoomObj = {
                'userId': newSecondaryUser._id,
                'roomId': mongoose.Types.ObjectId(inputData.klassSectionId),
                'name': inputData.studentData.name
            };
            auditManager.populateCreationAudit(loggedUserData, chatRoomObj);
            ChatRoom.create(chatRoomObj, function (err) {
                return next(err, newSecondaryUser);
            });
        }

    ], callback);
}

///////////// END of Student-Edit-Details ////////////////


///////////// START of Parent-Settings-Details ////////////////

//parentSettingInputData:{studentData, parentData, primaryUserData, secondaryUserData, klassSectionId,profilePictureUrl}
exports.updateParentSettingDetails = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var parentSettingInputData = req.body;

    async.waterfall([

        function (next) {

            var studentData = parentSettingInputData.studentData;
            var query = {'_id': mongoose.Types.ObjectId(studentData._id)};
            delete studentData._id;
            studentData.DOB = new Date(studentData.dob);
            auditManager.populateUpdateAudit(loggedUserData, studentData);

            Student.update(query, {$set: studentData}, function (err, data) {
                return next(err);
            });
        },

        function (next) {

            var primaryUserData = parentSettingInputData.primaryUserData;
            var query = {'_id': mongoose.Types.ObjectId(primaryUserData._id)};
            delete primaryUserData._id;
            auditManager.populateUpdateAudit(loggedUserData, primaryUserData);

            User.update(query, {$set: primaryUserData}, function (err, data) {
                return next(err);
            });
        },

        function (next) {

            var secondaryUserData = parentSettingInputData.secondaryUserData;
            if (!secondaryUserData.mobileNumber) {
                return next();
            }

            if (secondaryUserData._id) {
                var query = {'_id': mongoose.Types.ObjectId(secondaryUserData._id)};
                delete secondaryUserData._id;
                auditManager.populateUpdateAudit(loggedUserData, secondaryUserData);
                User.update(query, {$set: secondaryUserData}, function (err) {
                    return next(err, secondaryUserData);
                });
            } else {
                saveSecondaryMobileDependents(loggedUserData, parentSettingInputData, next);
            }
        },

        function (secondaryUser, next) {

            var parentData = parentSettingInputData.parentData;
            if(!parentData.secondaryUserId) parentData.secondaryUserId = secondaryUser._id;

            var query = {'_id': mongoose.Types.ObjectId(parentData._id)};
            delete parentData._id;
            auditManager.populateUpdateAudit(loggedUserData, parentData);

            Parent.update(query, {$set: parentData}, function (err, data) {
                return next(err);
            });
        },

        function (next) {

            var primaryUserData = parentSettingInputData.primaryUserData;

            var query = {'_id': mongoose.Types.ObjectId(loggedUserData.userId)};

            primaryUserData.profilePictureUrl = parentSettingInputData.profilePictureUrl
            delete primaryUserData._id;

            auditManager.populateUpdateAudit(loggedUserData, primaryUserData);

            User.update(query, {$set: primaryUserData}, function (err, data) {
                return next(err);
            });
        }

    ], function (err) {

        if (err) {
            return handleError(res, err)
        }

        return res.send(200, 'Successfully updated student data');
    });
};




function saveSecondaryMobileDependents(loggedUserData, studentInputData, callback) {

    var secondaryUserData = studentInputData.secondaryUserData;

    async.waterfall([

        function (next) {

            var query = {
                'mobileNumber': secondaryUserData.mobileNumber,
                'schoolId': loggedUserData.schoolId
            };

            User.findOne(query)
                .lean()
                .exec(function (err, userData) {

                    if (err || userData) return next(err, userData);

                    secondaryUserData.password = 'lap123'; //hardcoded
                    auditManager.populateCreationAccountAudit(loggedUserData, secondaryUserData);
                    User.create(secondaryUserData, next);
                });
        },

        function (secondaryUser, next) {

            var query = {
                'userId': secondaryUser._id,
                'roleId': Constant.UserRoleTypes.PARENT.roleId,
                'schoolId': loggedUserData.schoolId
            };
            SchoolUserRole.findOne(query)
                .lean()
                .exec(function (err, schoolUserRoleData) {
                    if (err || schoolUserRoleData) return next(err, secondaryUser);

                    var schoolRoleSecondaryData = {
                        'userId': secondaryUser._id,
                        'roleId': Constant.UserRoleTypes.PARENT.roleId
                    };
                    auditManager.populateCreationAccountAudit(loggedUserData, schoolRoleSecondaryData);
                    SchoolUserRole.create(schoolRoleSecondaryData, function (err) {
                        return next(err, secondaryUser);
                    });
                });
        },

        function (secondaryUser, next) {

            var chatRoomObj = {
                'userId': secondaryUser._id,
                'roomId': mongoose.Types.ObjectId(studentInputData.klassSectionId),
                'name': studentInputData.studentData.name
            };
            auditManager.populateCreationAudit(loggedUserData, chatRoomObj);
            ChatRoom.create(chatRoomObj, function (err) {
                return next(err, secondaryUser);
            });
        }

    ], callback);
}
///////////// END of Parent-Settings-Details ////////////////

function handleError(res, err) {
    return res.status(500).send(err);
}
