'use strict';

var async = require("async");
var _ = require("lodash");
var moment = require("moment");
var mongoose = require('mongoose');

var Constants = require('../dataconstants/constants');
var Staff = require('./staff.model');
var Student = require('../student/student.model');
var School = require('../school/school.model');
var SchoolUserRole = require('../schooluserrole/schooluserrole.model');
var User = require('../user/user.model');
var Klass = require('../klass/klass.model');
var KlassSection = require('../klasssection/klasssection.model');
var KlassSectionSubject = require('../klasssectionsubject/klasssectionsubject.model');
var KlassSectionStudent = require('../klasssectionstudent/klasssectionstudent.model');
var StudentAttendance = require('../studentattendance/studentattendance.model');
var EventModel = require('../event/event.model');
var LateArrival = require('../latearrival/latearrival.model');
var SchoolCalendar = require('../schoolcalendar/schoolcalendar.model');
var NotificationTargetTypeInstance = require('../notificationtargettypeinstance/notificationtargettypeinstance.model');
var auditManager = require('../../config/auditmanager');
var SchoolUtil = require('../school/school.util');
var StudentBehaviour = require('../studentbehaviour/studentbehaviour.model');
var BehaviouralScore = require('../behaviouralscore/behaviouralscore.model');
var BehaviouralAttribute = require('../behaviouralattribute/behaviouralattribute.model');
var KlassHolidayService = require('../klassholiday/klassholiday.service');
var ChatRoom = require('../chatroom/chatroom.model');
var Promise = require('bluebird');
mongoose.Promise = Promise;
var SchoolCalendarUtil = require("../schoolcalendar/schoolcalendar.util");
var NewsFeed = require('../newsfeed/newsfeed.model');
var NotificationInstance = require('../notificationinstance/notificationinstance.model');
var NotificationTargetType = require('../notificationtargettype/notificationtargettype.model');
var NotificationTargetTypes = require('../dataconstants/constants').NotificationTargetType;
var Parent = require('../parent/parent.model');
var NotificationUser = require('../notificationuser/notificationuser.model');
var UserSettings = require('../usersettings/usersettings.model');
var Expo = require('exponent-server-sdk');
var expo = new Expo();

var auth = require('../../auth/auth.service');


/*inputData = {
 userData:{name, mobileNumber email, profilePictureUrl},
 staffData:{address, city, DOB, specialization, isPrincipal},
 isSchoolAdmin:true|false
 }*/
exports.createStaff = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;

    var inputData = req.body;
    var userInputData = inputData.userData; //{name, mobileNumber, email}
    var staffInputData = inputData.staffData; //{address, city, DOB, specialization}
    var isSchoolAdmin = inputData.isSchoolAdmin;
    var UserRoleTypes = Constants.UserRoleTypes;

    async.waterfall([

        //If the editedStaff is slected as pincipal then unset the previous principal from 'Staff'
        function (next) {

            if (!staffInputData.isPrincipal) {
                return next();
            }

            var query = {
                schoolId: schoolId,
                isPrincipal: true
            };
            var updateData = {isPrincipal: false};
            auditManager.populateUpdateAudit(loggedUserData, updateData);
            Staff.update(query, {$set: updateData}, function (err, result) {
                next(err);
            });
        },

        //If the editedStaff is slected as pincipal then remove the
        // previous principal role(anyway previous pricipal can act as staff)
        function (next) {

            if (!staffInputData.isPrincipal) {
                return next();
            }


            var query = {
                schoolId: schoolId,
                roleId: UserRoleTypes.PRINCIPAL.roleId
            };
            SchoolUserRole.remove(query, function (err, result) {
                next(err);
            });
        },

        function (next) {

            createUserByMobileNumber(loggedUserData, userInputData, next);
        },


        function (staffUser, next) {

            var staffUserRoleDataList = [];
            var staffUserRoleData = {
                'roleId': UserRoleTypes.STAFF.roleId,
                'userId': staffUser._id
            };
            auditManager.populateCreationAccountAudit(loggedUserData, staffUserRoleData);
            staffUserRoleDataList.push(staffUserRoleData);

            if (staffInputData.isPrincipal) {
                var principalUserRoleData = {
                    'roleId': UserRoleTypes.PRINCIPAL.roleId,
                    'userId': staffUser._id
                };
                auditManager.populateCreationAccountAudit(loggedUserData, principalUserRoleData);
                staffUserRoleDataList.push(principalUserRoleData);
            }

            if (inputData.isSchoolAdmin) {
                var schoolAdminUserRoleData = {
                    'roleId': UserRoleTypes.SCHOOL_ADMIN.roleId,
                    'userId': staffUser._id
                };
                auditManager.populateCreationAccountAudit(loggedUserData, schoolAdminUserRoleData);
                staffUserRoleDataList.push(schoolAdminUserRoleData);
            }

            SchoolUserRole.create(staffUserRoleDataList, function (err) {
                return next(err, staffUser);
            });
        },

        function (staffUser, next) {

            Staff.find({'schoolId': loggedUserData.schoolId})
                .count(function (err, staffCount) {
                    return next(err, {'count': staffCount}, staffUser);
                });
        },


        function (staffCountData, staffUser, next) {
            staffInputData.rollNo = staffCountData.count + 1;
            staffInputData.DOB = new Date(staffInputData.DOB);
            staffInputData.userId = staffUser._id;
            staffInputData.specialization = _.map(staffInputData.specialization, function (schoolSubjectId) {
                return mongoose.Types.ObjectId(schoolSubjectId);
            });
            auditManager.populateCreationAccountAudit(loggedUserData, staffInputData);

            Staff.create(staffInputData, function (err, staffData) {
                return next(err, staffData, staffUser);
            });
        },

        //create a chat room record
        function (staffData, staffUser, next) {

            var chatRoomObj = {
                'userId': staffUser._id,
                'roomId': staffUser.schoolId,
                'name': staffUser.name
            };
            auditManager.populateCreationAudit(loggedUserData, chatRoomObj);
            ChatRoom.create(chatRoomObj, next);
        }

    ], function (err, data) {

        if (err) {
            return handleError(res, err);
        }

        return res.send(200, 'Success');
    });
};


//userInputData:{name, email, mobileNumber}
function createUserByMobileNumber(loggedUserData, userInputData, callback) {

    var query = {
        'schoolId': loggedUserData.schoolId,
        'mobileNumber': userInputData.mobileNumber
    };
    //find user using mobile number to check whether it already exists
    User.findOne(query, function (err, data) {
        if (err || data) { //if exists,no need to create user
            return callback(err, data);
        }

        userInputData.password = 'lap123'; //hardcoded
        auditManager.populateCreationAccountAudit(loggedUserData, userInputData);
        User.create(userInputData, callback);
    });
}


exports.getStaffByEmail = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;

    async.waterfall([

        function (next) {

            var query = {
                'email': req.params.email
            };
            User.find(query)
                .lean()
                .exec(next);
        },

        function (userList, next) {

            var userIdList = _.map(userList, "_id");
            var query = {
                'userId': {$in: userIdList},
                'isDeleted': false
            };
            Staff.find(query)
                .lean()
                .exec(next);
        }

    ], function done(err, staffList) {

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send(staffList);
    });
};


exports.getStaffByMobileNumber = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;

    async.waterfall([

        function (next) {

            var query = {
                'mobileNumber': req.params.mobileNumber
            };
            User.find(query)
                .lean()
                .exec(next);
        },

        function (userList, next) {

            var userIdList = _.map(userList, "_id");
            var query = {
                'userId': {$in: userIdList},
                'isDeleted': false
            };
            Staff.find(query)
                .lean()
                .exec(next);
        }

    ], function done(err, staffList) {

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send(staffList);
    });
};


exports.getStaffById = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var staffId = req.params.id;

    async.waterfall([

        function (next) {

            Staff.findById(staffId)
                .populate("userId")
                .lean()
                .exec(next);
        },

        function (staffData, next) {

            staffData.canDeleteStaff = true;

            var staffUserData = staffData.userId;
            staffData.staffUserData = staffUserData;
            var query = {
                'schoolId': loggedUserData.schoolId,
                'userId': staffUserData._id
            };
            SchoolUserRole.find(query)
                .sort("roleId")
                .lean()
                .exec(function (err, schoolUserRoles) {

                    if (err) return next(err);


                    var roleId2NameMapper = {};
                    _.each(Constants.UserRoleTypes, function (userRoleTypeData) {
                        roleId2NameMapper[userRoleTypeData.roleId] = userRoleTypeData.name;
                    });
                    staffData.staffUserRoles = _.map(schoolUserRoles, function (schoolUserRoleData) {
                        schoolUserRoleData.roleName = roleId2NameMapper[schoolUserRoleData.roleId];
                        return schoolUserRoleData;
                    });
                    return next(err, staffData);
                });
        },

        function (staffData, next) {

            var query = {
                'schoolId': schoolId,
                'staffId': mongoose.Types.ObjectId(staffId)
            };
            KlassSection.findOne(query)
                .lean()
                .exec(function (err, klassSectionData) {
                    if (err) {
                        return next(err);
                    }
                    if (klassSectionData) {
                        staffData.canDeleteStaff = false;
                    }
                    next(err, staffData);
                });
        },

        function (staffData, next) {

            var query = {
                'schoolId': schoolId,
                'staffId': mongoose.Types.ObjectId(staffId)
            };
            KlassSectionSubject.findOne(query)
                .lean()
                .exec(function (err, klassSectionSubjectData) {
                    if (err) {
                        return next(err);
                    }
                    if (klassSectionSubjectData) {
                        staffData.canDeleteStaff = false;
                    }
                    next(err, staffData);
                });
        }

    ], function done(err, staffData) {

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send(staffData);
    });
};

exports.getPrincipalMaster = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;

    async.waterfall([

        function (next) {

            Staff.findOne({schoolId: schoolId, isPrincipal: true})
                .populate("userId")
                .lean()
                .exec(next);
        },

        function (staffData, next) {

            if (!staffData) {
                return next(null, staffData)
            }
            var staffUserData = staffData.userId;
            staffData.staffUserData = staffUserData;
            var query = {
                'schoolId': loggedUserData.schoolId,
                'userId': staffUserData._id
            };
            SchoolUserRole.find(query)
                .sort("roleId")
                .lean()
                .exec(function (err, schoolUserRoles) {

                    if (err) return next(err);


                    var roleId2NameMapper = {};
                    _.each(Constants.UserRoleTypes, function (userRoleTypeData) {
                        roleId2NameMapper[userRoleTypeData.roleId] = userRoleTypeData.name;
                    });
                    staffData.staffUserRoles = _.map(schoolUserRoles, function (schoolUserRoleData) {
                        schoolUserRoleData.roleName = roleId2NameMapper[schoolUserRoleData.roleId];
                        return schoolUserRoleData;
                    });
                    return next(err, staffData);
                });
        }

    ], function done(err, staffData) {

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send(staffData);
    });
};

exports.getStaffByUserId = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;

    async.waterfall([

        function (next) {

            Staff.findOne({userId: req.params.userId})
                .populate("userId")
                .lean()
                .exec(next);
        },

        function (staffData, next) {

            var staffUserData = staffData.userId;
            staffData.staffUserData = staffUserData;
            var query = {
                'schoolId': loggedUserData.schoolId,
                'userId': staffUserData._id
            };
            SchoolUserRole.find(query)
                .sort("roleId")
                .lean()
                .exec(function (err, schoolUserRoles) {

                    if (err) return next(err);


                    var roleId2NameMapper = {};
                    _.each(Constants.UserRoleTypes, function (userRoleTypeData) {
                        roleId2NameMapper[userRoleTypeData.roleId] = userRoleTypeData.name;
                    });
                    staffData.staffUserRoles = _.map(schoolUserRoles, function (schoolUserRoleData) {
                        schoolUserRoleData.roleName = roleId2NameMapper[schoolUserRoleData.roleId];
                        return schoolUserRoleData;
                    });
                    return next(err, staffData);
                });
        }

    ], function done(err, staffData) {

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send(staffData);
    });
};


exports.getStaffList = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;

    async.waterfall([

        function (next) {

            var query = {
                'schoolId': schoolId,
                'isDeleted': false
            };
            Staff.find(query)
                .lean()
                .exec(next);
        },

        function (staffList, next) {

            var staffUserIdList = _.map(staffList, 'userId');
            var query = {
                'schoolId': schoolId,
                '_id': {$in: staffUserIdList}
            };

            User.find(query)
                .lean()
                .exec(function (err, data) {
                    return next(err, staffList, data);
                });
        },

        function (staffList, userList, next) {

            var userIdMapper = {};
            _.each(userList, function (userData) {
                userIdMapper[userData._id] = userData;
            });

            _.each(staffList, function (staffData) {
                var userData = userIdMapper[staffData.userId];
                staffData.name = userData.name.toLowerCase();
                staffData.mobileNumber = userData.mobileNumber;
                staffData.email = userData.email;
            });

            staffList = _.sortBy(staffList, 'name');
            _.map(staffList, function (staff) {
                var staffName = staff.name.toLowerCase();
                staff.name = staffName.substring(0, 1).toUpperCase() + staffName.substring(1);
                return staff;
            });

            return next(null, staffList);
        }


    ], function done(err, staffList) {

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send(staffList)
    });
};

exports.getStaffDashboardDetailsByUserId = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var userId = loggedUserData.userId;
    var academicYearData = loggedUserData.academicYearData;
    var today = new Date(req.params.date);
    var resultObj = {
        staffDetails: {},
        klassSections: [],
        ownKlassSection: {},
        ownKlassStudents: {},
        absentStudents: [],
        lateArrivalStudents: [],
        ownKlassAttendanceDetails: {
            absentStudents: [],
            lateArrivalStudents: [],
            noOfWorkingDays: 0,
            absentPercentage: 0,
            lateArrivalPercentage: 0,
            attendancePercentage: 0
        },
        birthdayWishes: [],
        timetable: {},
        diary: {},
        todayEvents: [],
        todaysNotifications: [],
        unreadNotificationsCount: 0,
        todayHolidays: [],
        isOwnSection: false,
        schoolInfo: null,
        schoolStaffs: [] //all  school staffs except logged user
    };

    async.waterfall([

        //Find Staff by user
        function (next) {
            findStaffData(userId, function (err, staffDetails) {
                resultObj.staffDetails = staffDetails;
                next(err, staffDetails);
            });
        },

        //FInd class sections(s) by staff
        function (staffObj, next) {
            findStaffSections(staffObj._id, function (err, klassSectionSubjectList) {
                resultObj.klassSections = klassSectionSubjectList;
                next(err, staffObj);
            });
        },

        //find own class for this staff(class teacher)
        function (staffObj, next) {
            findStaffOwnSection(loggedUserData, staffObj._id, function (err, ownKlassSection) {
                if (err) {
                    return next(err);
                }
                resultObj.ownKlassSection = ownKlassSection;
                resultObj.isOwnSection = (ownKlassSection.staffId.toString() == staffObj._id.toString());
                next(err, ownKlassSection);
            });
        },

        function (ownKlassSection, next) {
            findOwnSectionStudents(ownKlassSection._id, academicYearData._id, function (err, ownKlassSectionStudents) {
                if (err) {
                    return next(err);
                }
                resultObj.ownKlassStudents = _.sortBy(ownKlassSectionStudents, 'name');
                next(err, ownKlassSection)
            });
        },

        function (ownKlassSection, next) {
            var klassId = ownKlassSection.klassId;
            var academicYearFromDate = academicYearData.fromDate.date;
            SchoolUtil.getNoOfWorkingDays(klassId, academicYearData, today, function (err, noOfWorkingDays) {
                resultObj.ownKlassAttendanceDetails.noOfWorkingDays = noOfWorkingDays;
                next(err, ownKlassSection);
            });
        },

        function (ownKlassSection, next) {
            findStudentAbsentList(ownKlassSection._id, academicYearData._id, function (err, absentStudentList) {
                if (err) return next(err);
                resultObj.ownKlassAttendanceDetails.absentStudents = absentStudentList;
                next(err, ownKlassSection);
            });
        },

        function (ownKlassSection, next) {
            findLateArrivalStudents(ownKlassSection._id, academicYearData._id, function (err, lateArrivalStudents) {
                if (err) return next(err);
                resultObj.ownKlassAttendanceDetails.lateArrivalStudents = lateArrivalStudents;
                next(err, ownKlassSection);
            });
        },

        //calculate  attendance  chart data
        function (ownKlassSection, next) {
            calculateAttendancePercentageInfo(resultObj);
            next(null, ownKlassSection);
        },

        function (ownKlassSection, next) {

            SchoolCalendar.findByDate(today, function (err, calendarObj) {
                if (err) {
                    return next(err)
                }
                ownKlassSection.calendarObj = calendarObj;
                next(null, ownKlassSection);
            });
        },

        function (ownKlassSection, next) {

            var query = {
                'klassSectionId': ownKlassSection._id,
                'academicYearId': academicYearData._id,
                'schoolCalendarId': ownKlassSection.calendarObj._id
            };
            StudentAttendance.find(query)
                .lean()
                .exec(function (err, absentStudents) {
                    if (err) {
                        return next(err);
                    }
                    resultObj.absentStudents = absentStudents;
                    next(err, ownKlassSection);
                });
        },

        function (ownKlassSection, next) {

            var query = {
                'klassSectionId': ownKlassSection._id,
                'academicYearId': academicYearData._id,
                'schoolCalendarId': ownKlassSection.calendarObj._id
            };
            LateArrival.find(query)
                .lean()
                .exec(function (err, lateArrivalStudents) {
                    if (err) {
                        return next(err);
                    }
                    resultObj.lateArrivalStudents = lateArrivalStudents;
                    next(err);
                });
        },

        function (next) {

            resultObj.birthdayWishes = _.filter(resultObj.ownKlassStudents, function (studentObj) {
                var currentDate = moment().format("DD/MM")
                var birthdayDate = moment(studentObj.DOB).format("DD/MM")
                if ((currentDate == birthdayDate)) {
                    return studentObj;
                }
            });
            resultObj.birthdayWishes = _.sortBy(resultObj.birthdayWishes, function (birthdayWish) {
                return birthdayWish.name.toLowerCase()
            });
            next();
        },

        //This method used to fetch events for specific date
        function (next) {
            var calendarObj = resultObj.ownKlassSection.calendarObj;
            var eventInputData = {
                'loggedUserData': req.loggedUserData,
                'schoolCalendarId': calendarObj._id
            };
            EventModel.findByLoggedUserAndSchoolCalendar(eventInputData, function (err, eventList) {
                if (err) {
                    return next(err)
                }
                resultObj.todayEvents = eventList;
                next();
            });
        },

        function (next) {
            NotificationTargetTypeInstance.find({userId: userId})
                .sort({createdOn: -1})
                .populate(['notificationInstanceId', 'notificationTargetTypeId', 'createdBy'])
                .lean()
                .exec(function (err, notificationList) {

                    if (err) {
                        return next(err);
                    }

                    resultObj.todaysNotifications = notificationList;
                    next(err);
                })
        },

        function (next) {

            var query = {
                userId: userId,
                isNotificationRead: false
            };
            NotificationTargetTypeInstance.find(query)
                .count()
                .exec(function (err, unreadNotificationsCount) {

                    if (err) {
                        return next(err);
                    }

                    resultObj.unreadNotificationsCount = unreadNotificationsCount;
                    next(err);
                })
        },

        //get today school holiday list
        function (next) {
            var todaySchoolCalender = resultObj.ownKlassSection.calendarObj;
            var klassId = resultObj.ownKlassSection.klassId;
            KlassHolidayService.getKlassHolidaysBySchoolCalender(klassId, todaySchoolCalender._id)
                .then(function (todayHolidays) {
                    resultObj.todayHolidays = todayHolidays;
                    next();
                })
                .catch(next)
        },

        function (next) {
            School.findById(loggedUserData.schoolId).lean()
                .then(function (schoolData) {
                    resultObj.schoolInfo = schoolData;
                    next();
                })
                .catch(next)
        },

        function (next) {
            var query = {
                'schoolId': loggedUserData.schoolId,
                'isDeleted': false
            };
            Staff.find(query)
                .populate("userId")
                .lean()
                .then(function (docs) {
                    resultObj.schoolStaffs = _.filter(docs, function (staff) {
                        return staff.userId.toString() != loggedUserData.userId.toString()
                    })
                    resultObj.schoolStaffs = _.map(resultObj.schoolStaffs, function (staff) {
                        var staffUser = staff.userId;
                        staff.userId = staffUser._id;
                        staff.name = staffUser.name;
                        return staff;
                    })
                    next()
                })
                .catch(next)
        },


    ], function done(err) {

        if (err) {
            return handleError(res, err)
        }

        return res.status(200).send(resultObj);
    });
};


exports.wishBirthday = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;

    var inputData = req.body;
    var birthdayStudents = inputData.birthdayStudents;
    var birthdayMessage = inputData.message;

    async.waterfall([

        function (next) {

            var birthdayWishes = birthdayStudents.map(function (birthdayStudent) {
                var birthDayFeed = {};
                birthDayFeed.text = birthdayMessage + " to " + birthdayStudent.name;
                birthDayFeed.mediaUrl = "http://congratulationsto.com/cards/birthday-wishes-cake.jpg";
                birthDayFeed.uploadedUser = loggedUserData.userId;
                auditManager.populateCreationAccountAudit(loggedUserData, birthDayFeed);
                return birthDayFeed;
            });

            NewsFeed.create(birthdayWishes, function (err, data) {
                return next(err);
            });
        },

        function (next) {

            var notificationInstanceInputData = {
                message: birthdayMessage,
                date: new Date()
            };
            auditManager.populateCreationAccountAudit(loggedUserData, notificationInstanceInputData);
            NotificationInstance.create(notificationInstanceInputData, next);
        },

        function (notificationInstanceData, next) {

            var notificationTargetTypeInputData = {
                targetTypeId: NotificationTargetTypes.SELECTED_SECTION_STUDENTS,
                notificationInstanceId: notificationInstanceData._id
            };
            auditManager.populateCreationAccountAudit(loggedUserData, notificationTargetTypeInputData);
            NotificationTargetType.create(notificationTargetTypeInputData, next)
        },

        //find notification parents/staffs using inputUserList and targetTypeId
        function (notificationTargetTypeInstanceData, next) {

            var parentIdList = _.map(birthdayStudents, 'parentId');
            var query = {
                'schoolId': loggedUserData.schoolId,
                '_id': {'$in': parentIdList}
            };
            Parent.find(query)
                .lean()
                .exec(function (err, parentList) {
                    if (err) {
                        return next(err);
                    }

                    var parentIdMapper = {};
                    _.each(parentList, function (parentData) {
                        parentIdMapper[parentData._id] = parentData;
                    });


                    var studentTargetUserList = [];
                    _.each(birthdayStudents, function (student) {
                        var parentData = parentIdMapper[student.parentId];
                        studentTargetUserList.push({ //primaryParentNotificationInstData
                            'userId': parentData.userId.toString(),
                            'studentId': student.studentId
                        });

                        if (parentData.secondaryUserId) {
                            studentTargetUserList.push({ //secondaryParentNotificationInstData
                                'userId': parentData.secondaryUserId.toString(),
                                'studentId': student.studentId
                            });
                        }
                    });

                    next(null, studentTargetUserList, notificationTargetTypeInstanceData)
                });
        },

        //find notification users using list of user ids
        function (notificationUserList, notificationTargetTypeInstanceData, next) {

            var uniqueNotificationTargetUserList = _.uniq(notificationUserList, function (notificationUser) {
                return notificationUser.userId && notificationUser.studentId;
            });

            var notificationTargetTypeInstances = _.map(uniqueNotificationTargetUserList, function (uniqueNotificationTargetUser) {
                var instanceObj = {
                    notificationInstanceId: notificationTargetTypeInstanceData.notificationInstanceId,
                    notificationTargetTypeId: notificationTargetTypeInstanceData._id,
                    userId: uniqueNotificationTargetUser.userId,
                    studentId: uniqueNotificationTargetUser.studentId
                };
                auditManager.populateCreationAccountAudit(loggedUserData, instanceObj);
                return instanceObj;
            });

            NotificationTargetTypeInstance.create(notificationTargetTypeInstances, function (err, notificationTargetTypeInstance) {
                return next(err, uniqueNotificationTargetUserList);
            });
        },

        //filter notificationUserList by userSettings and notificationUser and push the birthday wish message
        function (notificationUserList, next) {

            pushNotification(birthdayMessage, notificationUserList, next);
        }

    ], function done(err) {

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send('wished successfully');
    });
};


function pushNotification(message, notificationTargetUserList, callback) {

    async.waterfall([

            //find notification users using list of user ids
            function (next) {
                var userIds = _.map(notificationTargetUserList, 'userId');
                NotificationUser.find({userId: {'$in': userIds}})
                    .lean()
                    .exec(function (err, notificationUserList) {

                        if (err) return next(err);

                        var uniqNotificationUserList = _.uniq(notificationUserList, function (notificationUserData) {
                            return notificationUserData.userId.toString() && notificationUserData.notificationId;
                        });
                        return next(null, uniqNotificationUserList);
                    });
            },


            //filter notificationUserList by userSettings
            function (notificationUserList, next) {

                var userIdList = _.map(notificationUserList, "userId");
                UserSettings.find({'userId': {'$in': userIdList}})
                    .lean()
                    .exec(function (err, userSettingsList) {

                        if (err) {
                            return next(err);
                        }

                        var userSettingMapper = {};
                        _.each(userSettingsList, function (userSettingsData) {
                            userSettingMapper[userSettingsData.userId] = userSettingsData;
                        });

                        var notificationEnabledUserList = _.filter(notificationUserList, function (notificationUserData) {
                            var userSettingsData = userSettingMapper[notificationUserData.userId];
                            if (!userSettingsData)
                                return true; //User is yet to set the settings.. default is notificationDisabled:false
                            return !userSettingsData.notificationDisabled;
                        });
                        return next(err, notificationEnabledUserList);
                    });
            },

            function (notificationUserList, next) {

                if (notificationUserList.length == 0) return next(null, []);

                var receiptUsers = _.map(notificationUserList, function (notificationUser) {
                    return {
                        // The push token for the app user to whom you want to send the notification
                        to: notificationUser.notificationId,
                        sound: 'default',
                        body: message,
                        data: {withSome: message}
                    }
                });

                expo.sendPushNotificationsAsync(receiptUsers)
                    .then(function (receipts) {
                        console.log(receipts);
                    }).catch(function (error) {
                    console.error("Birthday WIsh PushNotification Err: " + error);
                });
                next(null, receiptUsers);
            }],

        function done(err, data) {

            return callback(err, data);
        });
}


exports.getStaffDashboardDetailsToWeb = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var academicYearData = req.loggedUserData.academicYearData;
    var userId = loggedUserData.userId;
    var schoolId = loggedUserData.schoolId;
    var today = new Date(req.params.date);
    var staffDashboardInfo = {
        staffDetails: {},
        ownKlassSection: {},
        ownKlassStudents: [],
        todayBirthdayStudents: [],
        todayEvents: [],
        notifications: [],
        behaviourChartDetails: [],
        ownKlassAttendanceInfo: {
            absentStudents: [],
            lateArrivalStudents: [],
            noOfWorkingDays: 0,
            absentPercentage: 0,
            lateArrivalPercentage: 0,
            attendancePercentage: 0
        },
        isOwnSection: false
    };

    var processingData = {
        behaviouralScoreList: [],
        studentBehaviourList: []
    };

    var schoolCalenderId = null;
    async.waterfall([

        //Find Staff by user
        function (next) {
            findStaffData(userId, function (err, staffDetails) {
                staffDashboardInfo.staffDetails = staffDetails;
                next(err, staffDetails);
            });
        },

        //find own class for this staff(class teacher)
        function (staffObj, next) {
            findStaffOwnSection(loggedUserData, staffObj._id, function (err, ownKlassSection) {
                if (err) {
                    return next(err);
                }
                staffDashboardInfo.ownKlassSection = ownKlassSection;
                staffDashboardInfo.isOwnSection = (ownKlassSection.staffId.toString() == staffObj._id.toString());
                next(err, ownKlassSection);
            });
        },

        //own section students
        function (ownKlassSection, next) {
            if (!ownKlassSection) {
                return next(null, ownKlassSection);
            }
            findOwnSectionStudents(ownKlassSection._id, academicYearData._id, function (err, ownKlassSectionStudents) {
                if (err) {
                    return next(err);
                }
                staffDashboardInfo.ownKlassStudents = ownKlassSectionStudents;
                staffDashboardInfo.todayBirthdayStudents = _.filter(ownKlassSectionStudents, function (ownKlassSectionStudent) {
                    var dob = ownKlassSectionStudent.DOB;
                    return (today.getMonth() == dob.getMonth() && today.getDate() == dob.getDate());
                });
                next(err, ownKlassSection)
            });
        },


        function (ownKlassSection, next) {
            if (!ownKlassSection) {
                return next(null, ownKlassSection);
            }
            var klassId = ownKlassSection.klassId;
            var academicYearFromDate = academicYearData.fromDate.date;
            SchoolUtil.getNoOfWorkingDays(klassId, academicYearData, today, function (err, noOfWorkingDays) {
                staffDashboardInfo.ownKlassAttendanceInfo.noOfWorkingDays = noOfWorkingDays;
                next(err, ownKlassSection);
            });
        },

        function (ownKlassSection, next) {
            if (!ownKlassSection) {
                return next(null, ownKlassSection);
            }
            findStudentAbsentList(ownKlassSection._id, academicYearData._id, function (err, klassSectionAttendanceList) {
                if (err) return next(err);
                staffDashboardInfo.ownKlassAttendanceInfo.absentStudents = klassSectionAttendanceList;
                next(err, ownKlassSection);
            });
        },

        function (ownKlassSection, next) {
            if (!ownKlassSection) {
                return next(null, ownKlassSection);
            }
            findLateArrivalStudents(ownKlassSection._id, academicYearData._id, function (err, lateArrivalStudents) {
                if (err) return next(err);
                staffDashboardInfo.ownKlassAttendanceInfo.lateArrivalStudents = lateArrivalStudents;
                next(err, ownKlassSection);
            });
        },

        //calculate  attendance  chart data
        function (ownKlassSection, next) {
            if (!ownKlassSection) {
                return next(null, ownKlassSection);
            }
            calculateAttendancePercentageInfo(staffDashboardInfo.ownKlassAttendanceInfo);
            next(null, ownKlassSection);
        },

        function (ownKlassSection, next) {
            var currentDate = today;
            SchoolCalendar.findByDate(currentDate, function (err, calendarObj) {
                if (err) {
                    return next(err)
                }
                schoolCalenderId = calendarObj._id;
                next();
            });
        },


        //This method used to fetch events for specific date
        function (next) {
            var eventInputData = {
                'loggedUserData': loggedUserData,
                'schoolCalendarId': schoolCalenderId
            };
            EventModel.findByLoggedUserAndSchoolCalendar(eventInputData, function (err, eventList) {
                if (err) {
                    return next(err)
                }
                staffDashboardInfo.todayEvents = eventList;
                next();
            });
        },
        function (next) {
            NotificationTargetTypeInstance.find({userId: userId})
                .sort({createdOn: -1})
                .populate(['notificationInstanceId', 'notificationTargetTypeId', 'createdBy'])
                .lean()
                .exec(function (err, notificationList) {

                    if (err) {
                        return next(err);
                    }

                    staffDashboardInfo.notifications = notificationList;
                    next(err);
                })
        },

        function (next) {

            BehaviouralScore.find({schoolId: schoolId})
                .lean()
                .sort({'scoreValue': -1})
                .exec(function (err, behaviouralScoreData) {
                    if (err) {
                        return next(err)
                    }

                    staffDashboardInfo.behaviouralScoreList = behaviouralScoreData;
                    next();
                })
        },

        //find the behaviour data for the klass students
        function (next) {

            var klassSectionStudentIds = _.map(staffDashboardInfo.ownKlassStudents, '_id');
            StudentBehaviour.find({klassSectionStudentId: {$in: klassSectionStudentIds}})
                .populate('behaviouralScoreId')
                .lean()
                .exec(function (err, behaviourList) {
                    if (err) {
                        return next(err);
                    }
                    processingData.studentBehaviourList = behaviourList;

                    next()
                });
        },

        //find student behaviour chart data

        function (next) {

            _.each(staffDashboardInfo.behaviouralScoreList, function (scoreObj) {

                var axisObj = {
                    key: scoreObj.displayName
                };

                var behaviourScoreValue = _.filter(processingData.studentBehaviourList, function (behaviourObj) {
                    return behaviourObj.behaviouralScoreId && (behaviourObj.behaviouralScoreId._id.toString() == scoreObj._id.toString());
                }).length;
                axisObj.y = ((behaviourScoreValue / processingData.studentBehaviourList.length) * 100).toFixed(2);
                staffDashboardInfo.behaviourChartDetails.push(axisObj);
            });
            next();

        }

    ], function (err) {
        if (err) return res.status(500).send(err);
        return res.status(200).send(staffDashboardInfo);
    });


}


function findStaffData(userId, callback) {
    Staff.findOne({userId: userId})
        .populate('userId')
        .lean()
        .exec(function (err, staffObj) {
            if (err) return callback(err);
            var staffUserData = staffObj.userId;
            staffObj.staffName = staffUserData.name;
            staffObj.staffEmail = staffUserData.email;
            staffObj.staffMobileNumber = staffUserData.mobileNumber;
            callback(err, staffObj);
        });
}

function findStaffSections(staffId, callback) {
    KlassSectionSubject.find({staffId: staffId})
        .populate(['klassSectionId', 'subjectTypeId', 'staffId'])
        .lean()
        .exec(function (err, docs) {

            if (err) {
                return next(err);
            }

            var options = {
                path: 'staffId.userId',
                model: 'User'
            };

            KlassSectionSubject.populate(docs, options, function (err, klassSectionSubjectList) {

                if (err) {
                    return next(err);
                }

                _.each(klassSectionSubjectList, function (klassSectionSubject) {

                    var klassSectionData = klassSectionSubject.klassSectionId;
                    var subjectTypeData = klassSectionSubject.subjectTypeId;

                    klassSectionSubject.klassSectionName = klassSectionData.klassSectionName;
                    klassSectionSubject.sectionName = klassSectionData.sectionName;

                    klassSectionSubject.subjectName = subjectTypeData.subjectName;
                    klassSectionSubject.subjectDescription = subjectTypeData.description;

                    var staffData = klassSectionSubject.staffId;
                    var staffUserData = staffData.userId.toObject();
                    klassSectionSubject.userId = staffUserData._id;
                    klassSectionSubject.staffName = staffUserData.name;
                    klassSectionSubject.staffMobileNumber = staffUserData.mobileNumber;
                    klassSectionSubject.staffProfilePic = staffUserData.profilePictureUrl;
                    klassSectionSubject.staffEmail = staffUserData.email;
                });
                callback(err, klassSectionSubjectList);
            });
        });
}

function findStaffOwnSection(loggedUserData, staffId, callback) {

    var query = (!loggedUserData.klassSectionId) ?
    {'staffId': staffId} :
    {'_id': mongoose.Types.ObjectId(loggedUserData.klassSectionId)};

    KlassSection.findOne(query)
        .populate('klassId')
        .lean()
        .exec(callback);
}

function findOwnSectionStudents(klassSectionId, academicYearId, callback) {

    var query = {
        'klassSectionId': klassSectionId,
        'academicYearId': academicYearId,
        'isDeleted': false
    };
    KlassSectionStudent.find(query)
        .populate('studentId')
        .lean()
        .exec(function (err, ownKlassSectionStudents) {
            if (err) {
                return callback(err);
            }
            _.each(ownKlassSectionStudents, function (ownKlassSectionStudent) {
                var studentData = ownKlassSectionStudent.studentId;
                ownKlassSectionStudent.klassSectionStudentId = ownKlassSectionStudent._id;
                ownKlassSectionStudent.name = studentData.name;
                ownKlassSectionStudent.rollNo = studentData.rollNo;
                ownKlassSectionStudent.admissionNo = studentData.admissionNo;
                ownKlassSectionStudent.fatherName = studentData.fatherName;
                ownKlassSectionStudent.motherName = studentData.motherName;
                ownKlassSectionStudent.DOB = studentData.DOB;
                ownKlassSectionStudent.isRegistered = studentData.isRegistered;
                ownKlassSectionStudent.profilePictureUrl = studentData.profilePictureUrl;
                ownKlassSectionStudent.studentId = studentData._id;
                ownKlassSectionStudent.parentId = studentData.parentId;
            });
            var orderedOwnKlassSectionStudents = _.sortBy(ownKlassSectionStudents, "name");
            callback(err, orderedOwnKlassSectionStudents)
        });
}


function findStudentAbsentList(klassSectionId, academicYearId, callback) {
    var query = {
        'klassSectionId': klassSectionId,
        'academicYearId': academicYearId
    };
    StudentAttendance.find(query)
        .lean()
        .populate("schoolCalendarId")
        .exec(callback);
}


function findLateArrivalStudents(klassSectionId, academicYearId, callback) {
    var query = {
        'klassSectionId': klassSectionId,
        'academicYearId': academicYearId
    };
    LateArrival.find(query)
        .lean()
        .exec(callback);
}

function calculateAttendancePercentageInfo(klassStudentsInfo) {
    if (!klassStudentsInfo.ownKlassAttendanceDetails) {
        return;
    }
    var attendanceInfo = klassStudentsInfo.ownKlassAttendanceDetails;
    var numWorkingDays = attendanceInfo.noOfWorkingDays;
    var numStudents = klassStudentsInfo.ownKlassStudents.length;
    var absentPercentage = (attendanceInfo.absentStudents.length / (numWorkingDays * numStudents)) * 100;
    var lateArrivalPercentage = (attendanceInfo.lateArrivalStudents.length / (numWorkingDays * numStudents)) * 100;
    var attendancePercentage = 100 - (absentPercentage + lateArrivalPercentage);
    attendanceInfo.absentPercentage = absentPercentage;
    attendanceInfo.lateArrivalPercentage = lateArrivalPercentage;
    attendanceInfo.attendancePercentage = attendancePercentage;
}


//inputDataList:[{name, email, mobileNumber, city, DOB, specialization}, {}, ..]
exports.createStaffByBulkOperation = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var inputDataList = req.body.dbData;

    async.waterfall([

        function (next) {

            var mobileNumberList = _.map(inputDataList, 'mobileNumber');
            var query = {
                'schoolId': loggedUserData.schoolId,
                'mobileNumber': {$in: mobileNumberList}
            };
            //find user using mobile number to check whether it already exists
            User.find(query)
                .lean()
                .exec(next);
        },


        function (existingStaffUserList, next) {

            var mobileNumberToUserMapper = {};
            _.each(existingStaffUserList, function (userData) {
                mobileNumberToUserMapper[userData.mobileNumber] = userData;
            });


            var staffUserInputDataList = [];
            _.each(inputDataList, function (staffInputData) {
                if (!mobileNumberToUserMapper[staffInputData.mobileNumber]) {
                    var staffUserData = {
                        name: staffInputData.name,
                        email: staffInputData.email,
                        mobileNumber: staffInputData.mobileNumber,
                        password: "lap123"
                    };
                    auditManager.populateCreationAccountAudit(loggedUserData, staffUserData);
                    staffUserInputDataList.push(staffUserData);
                }
            });
            if (staffUserInputDataList.length == 0) {
                return next(null, existingStaffUserList);
            }


            User.create(staffUserInputDataList, function (err, newlyCreatedStaffUserList) {
                var totalStaffUserList = _.compact(existingStaffUserList.concat(newlyCreatedStaffUserList));
                return next(err, totalStaffUserList);
            });
        },

        function (staffUserList, next) {

            var staffUserRoleDataList = _.map(staffUserList, function (staffUser) {
                var staffUserRoleData = {
                    'roleId': Constants.UserRoleTypes.STAFF.roleId,
                    'userId': staffUser._id
                };
                auditManager.populateCreationAccountAudit(loggedUserData, staffUserRoleData);
                return staffUserRoleData;
            });
            SchoolUserRole.create(staffUserRoleDataList, function (err) {
                return next(err, staffUserList);
            });
        },

        function (staffUserList, next) {

            Staff.find({'schoolId': loggedUserData.schoolId, 'isDeleted': false})
                .count(function (err, staffCount) {

                    return next(err, {'count': staffCount}, staffUserList);
                });
        },


        function (staffCountData, staffUserList, next) {

            var staffMobileNumber2UserIdMapper = {};
            _.each(staffUserList, function (staffUser) {
                staffMobileNumber2UserIdMapper[staffUser.mobileNumber] = staffUser._id;
            });
            //{address, city, DOB, specialization, rollNo}
            var staffUserDataList = _.map(inputDataList, function (inputData) {
                var staffUserData = {
                    address: inputData.address,
                    city: inputData.city,
                    DOB: new Date(inputData.DOB),
                    'specialization': _.map(inputData.specialization, function (schoolSubjectId) {
                        return mongoose.Types.ObjectId(schoolSubjectId);
                    }),
                    rollNo: staffCountData.count++,
                    userId: staffMobileNumber2UserIdMapper[inputData.mobileNumber]
                };
                auditManager.populateCreationAccountAudit(loggedUserData, staffUserData);
                return staffUserData;
            });
            Staff.create(staffUserDataList, next);
        }

    ], function (err, data) {

        if (err) {
            return handleError(res, err);
        }

        return res.send(200, 'Success');
    });
};


exports.getPrincipalDashboardDetailsByUserId = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;
    var schoolId = loggedUserData.schoolId;
    var userId = loggedUserData.userId;
    var currentDate = req.params.date;
    var schoolCalendarId;
    var principalDashboardData = {
        'totalNumberOfGirlsInSchool': 0,
        'totalNumberOfBoysInSchool': 0,
        'teachersAttendance': {
            'totalNumberOfTeachersInSchool': 0,
            'numberOfTeachersPresent': 0
        },
        'studentsAttendance': {
            'totalNumberOfStudents': 0,
            'numberOfStudentsPresent': 0,
            'klassAttendances': [
                //{klassName, numberOfStudents, numberOfPresent}
            ]
        },
        'events': [],
        'notifications': [],
        'allTeachers': [],
        "schoolInfo": null
    };

    async.waterfall([

        function (next) {

            Student.find({schoolId: loggedUserData.schoolId, 'isDeleted': false})
                .lean()
                .exec(function (err, studentList) {
                    if (err) {
                        return next(err);
                    }
                    principalDashboardData.studentsAttendance.totalNumberOfStudents = studentList.length;
                    principalDashboardData.totalNumberOfBoysInSchool = _.filter(studentList, function (studentObj) {
                        return studentObj.gender == 'male';
                    }).length;

                    principalDashboardData.totalNumberOfGirlsInSchool = _.filter(studentList, function (studentObj) {
                        return studentObj.gender == 'female';
                    }).length;
                    next(err, studentList);
                });
        },

        function (studentList, next) {

            SchoolCalendar.findByDate(currentDate, function (err, calendarObj) {
                if (err) {
                    return next(err)
                }
                schoolCalendarId = calendarObj._id;
                next(err, schoolCalendarId, studentList);
            });
        },

        function (schoolCalendarId, studentList, next) {
            var query = {
                'academicYearId': academicYearData._id,
                'schoolId': loggedUserData.schoolId,
                'schoolCalendarId': schoolCalendarId
            };
            StudentAttendance.find(query)
                .lean()
                .populate('klassSectionId')
                .exec(function (err, studentAbsentList) {
                    if (err) {
                        return next(err);
                    }
                    principalDashboardData.studentsAttendance.numberOfStudentsPresent = studentList.length - studentAbsentList.length;
                    next(err, studentAbsentList);
                });
        },


        function (studentAbsentList, next) {
            Klass.find({schoolId: loggedUserData.schoolId})
                .sort({'order': 1})
                .lean()
                .exec(function (err, klassList) {
                    next(err, klassList, studentAbsentList);
                });
        },

        function (klassList, studentAbsentList, next) {
            var query = {
                'academicYearId': academicYearData._id,
                'schoolId': loggedUserData.schoolId,
                'isDeleted': false
            };
            KlassSectionStudent.find(query)
                .lean()
                .exec(function (err, klassSectionStudents) {

                    if (err) {
                        return next();
                    }

                    _.each(klassList, function (klassObj) {
                        var klassAttendanceObj = {
                            klassName: klassObj.klassName
                        };

                        klassAttendanceObj.numberOfStudents = _.filter(klassSectionStudents, function (klassSectionObj) {
                            return klassSectionObj.klassId.toString() == klassObj._id.toString();
                        }).length;

                        var numberOfAbsent = _.filter(studentAbsentList, function (studentAbsentObj) {
                            return studentAbsentObj.klassSectionId.klassId.toString() == klassObj._id.toString();
                        }).length;

                        klassAttendanceObj.numberOfPresent = klassAttendanceObj.numberOfStudents - numberOfAbsent;
                        principalDashboardData.studentsAttendance.klassAttendances.push(klassAttendanceObj);
                    });
                    next();
                });
        },

        //This method used to fetch events for specific date
        function (next) {
            var eventInputData = {
                'loggedUserData': loggedUserData,
                'schoolCalendarId': schoolCalendarId
            };
            EventModel.findByLoggedUserAndSchoolCalendar(eventInputData, function (err, eventList) {
                if (err) {
                    return next(err);
                }
                principalDashboardData.events = eventList;
                next(err);
            });
        },

        function (next) {
            var notificationInputData = {
                'currentDate': new Date(currentDate),
                'loggedUserData': loggedUserData
            };
            NotificationInstance.findNotificationByDate(notificationInputData, function (err, notificationList) {
                if (err) {
                    return next(err);
                }
                principalDashboardData.notifications = notificationList;
                next(err);
            });
        },

        function (next) {
            var query = {
                'schoolId': schoolId,
                'isDeleted': false
            };
            Staff.find(query)
                .lean()
                .exec(function (err, docs) {
                    next(err, docs)
                });
        },

        function (staffList, next) {
            var staffUserIdList = _.map(staffList, 'userId');
            var query = {
                'schoolId': schoolId,
                '_id': {$in: staffUserIdList}
            };
            User.find(query)
                .lean()
                .exec(function (err, data) {
                    return next(err, staffList, data);
                });
        },

        function (staffList, userList, next) {

            var userIdMapper = {};
            _.each(userList, function (userData) {
                userIdMapper[userData._id] = userData;
            });

            _.each(staffList, function (staffData) {
                var userData = userIdMapper[staffData.userId];
                staffData.name = userData.name;
                staffData.mobileNumber = userData.mobileNumber;
                staffData.email = userData.email;
            });

            principalDashboardData.allStaffs = staffList;
            return next(null);
        },

        function (next) {
            School.findById(loggedUserData.schoolId)
                .lean()
                .exec(function (err, schoolData) {
                    if (err) {
                        return next(err);
                    }
                    principalDashboardData.schoolInfo = schoolData;
                    next(err);
                });
        }

    ], function done(err) {

        if (err) {
            return handleError(res, err);
        }
        return res.send(200, principalDashboardData);
    });
};


exports.getSchoolAdminDashboardDetailsByUserId = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;
    var schoolId = loggedUserData.schoolId;
    var userId = loggedUserData.userId;
    var currentDate = req.params.date;
    var schoolCalendarId;
    var principalDashboardData = {
        'totalNumberOfGirlsInSchool': 0,
        'totalNumberOfBoysInSchool': 0,
        'teachersAttendance': {
            'totalNumberOfTeachersInSchool': 0,
            'numberOfTeachersPresent': 0
        },
        'studentsAttendance': {
            'totalNumberOfStudents': 0,
            'numberOfStudentsPresent': 0,
            'klassAttendances': [
                //{klassName, numberOfStudents, numberOfPresent}
            ]
        },
        'events': [],
        'notifications': [],
        'allTeachers': [],
        "schoolInfo": null
    };

    async.waterfall([

        function (next) {

            Student.find({schoolId: loggedUserData.schoolId, 'isDeleted': false})
                .lean()
                .exec(function (err, studentList) {
                    if (err) {
                        return next(err);
                    }
                    principalDashboardData.studentsAttendance.totalNumberOfStudents = studentList.length;
                    principalDashboardData.totalNumberOfBoysInSchool = _.filter(studentList, function (studentObj) {
                        return studentObj.gender == 'male';
                    }).length;

                    principalDashboardData.totalNumberOfGirlsInSchool = _.filter(studentList, function (studentObj) {
                        return studentObj.gender == 'female';
                    }).length;
                    next(err, studentList);
                });
        },

        function (studentList, next) {

            SchoolCalendar.findByDate(currentDate, function (err, calendarObj) {
                if (err) {
                    return next(err)
                }
                schoolCalendarId = calendarObj._id;
                next(err, schoolCalendarId, studentList);
            });
        },

        function (schoolCalendarId, studentList, next) {
            var query = {
                'schoolId': loggedUserData.schoolId,
                'schoolCalendarId': schoolCalendarId
            };
            if (academicYearData)query['academicYearId'] = academicYearData._id;
            StudentAttendance.find(query)
                .lean()
                .populate('klassSectionId')
                .exec(function (err, studentAbsentList) {
                    if (err) {
                        return next(err);
                    }
                    principalDashboardData.studentsAttendance.numberOfStudentsPresent = studentList.length - studentAbsentList.length;
                    next(err, studentAbsentList);
                });
        },


        function (studentAbsentList, next) {
            Klass.find({schoolId: loggedUserData.schoolId})
                .sort({'order': 1})
                .lean()
                .exec(function (err, klassList) {
                    next(err, klassList, studentAbsentList);
                });
        },

        function (klassList, studentAbsentList, next) {
            var query = {
                'schoolId': loggedUserData.schoolId,
                'isDeleted': false
            };
            if (academicYearData)query['academicYearId'] = academicYearData._id;
            KlassSectionStudent.find(query)
                .lean()
                .exec(function (err, klassSectionStudents) {

                    if (err) {
                        return next();
                    }

                    _.each(klassList, function (klassObj) {
                        var klassAttendanceObj = {
                            klassName: klassObj.klassName
                        };

                        klassAttendanceObj.numberOfStudents = _.filter(klassSectionStudents, function (klassSectionObj) {
                            return klassSectionObj.klassId.toString() == klassObj._id.toString();
                        }).length;

                        var numberOfAbsent = _.filter(studentAbsentList, function (studentAbsentObj) {
                            return studentAbsentObj.klassSectionId.klassId.toString() == klassObj._id.toString();
                        }).length;

                        klassAttendanceObj.numberOfPresent = klassAttendanceObj.numberOfStudents - numberOfAbsent;
                        principalDashboardData.studentsAttendance.klassAttendances.push(klassAttendanceObj);
                    });
                    next();
                });
        },

        //This method used to fetch events for specific date
        function (next) {
            var eventInputData = {
                'loggedUserData': loggedUserData,
                'schoolCalendarId': schoolCalendarId
            };
            EventModel.findByLoggedUserAndSchoolCalendar(eventInputData, function (err, eventList) {
                if (err) {
                    return next(err);
                }
                principalDashboardData.events = eventList;
                next(err);
            });
        },

        function (next) {
            var notificationInputData = {
                'currentDate': new Date(currentDate),
                'loggedUserData': loggedUserData
            };
            NotificationInstance.findNotificationByDate(notificationInputData, function (err, notificationList) {
                if (err) {
                    return next(err);
                }
                principalDashboardData.notifications = notificationList;
                next(err);
            });
        },

        function (next) {
            var query = {
                'schoolId': schoolId,
                'isDeleted': false
            };
            Staff.find(query)
                .lean()
                .exec(function (err, docs) {
                    next(err, docs)
                });
        },

        function (staffList, next) {
            var staffUserIdList = _.map(staffList, 'userId');
            var query = {
                'schoolId': schoolId,
                '_id': {$in: staffUserIdList}
            };
            User.find(query)
                .lean()
                .exec(function (err, data) {
                    return next(err, staffList, data);
                });
        },

        function (staffList, userList, next) {

            var userIdMapper = {};
            _.each(userList, function (userData) {
                userIdMapper[userData._id] = userData;
            });

            _.each(staffList, function (staffData) {
                var userData = userIdMapper[staffData.userId];
                staffData.name = userData.name;
                staffData.mobileNumber = userData.mobileNumber;
                staffData.email = userData.email;
            });

            principalDashboardData.allStaffs = staffList;
            return next(null);
        },

        function (next) {
            School.findById(loggedUserData.schoolId)
                .lean()
                .exec(function (err, schoolData) {
                    if (err) {
                        return next(err);
                    }
                    principalDashboardData.schoolInfo = schoolData;
                    next(err);
                });
        }

    ], function done(err) {

        if (err) {
            return handleError(res, err);
        }
        return res.send(200, principalDashboardData);
    });
};

exports.getStaffObj = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var staffId = req.params.staffId;
    var staffEditData = {canDeleteStaff: true};

    async.waterfall([

        function (next) {

            var query = {
                'schoolId': schoolId,
                '_id': staffId
            };
            Staff.findOne(query)
                .lean()
                .exec(function (err, staffData) {
                    if (err) {
                        return next(err);
                    }
                    staffEditData.staffData = staffData;
                    next();
                });

        },

        function (next) {

            var query = {
                'schoolId': schoolId,
                '_id': mongoose.Types.ObjectId(staffEditData.staffData.userId)
            };
            User.findOne(query)
                .lean()
                .exec(function (err, userData) {
                    if (err) {
                        return next(err);
                    }
                    staffEditData.userData = userData;
                    next();
                });
        },

        function (next) {

            var query = {
                'schoolId': schoolId,
                'staffId': mongoose.Types.ObjectId(staffId)
            };
            KlassSection.findOne(query)
                .lean()
                .exec(function (err, klassSectionData) {
                    if (err) {
                        return next(err);
                    }
                    if (klassSectionData) {
                        staffEditData.canDeleteStaff = false;
                    }
                    next();
                });
        },

        function (next) {

            var query = {
                'schoolId': schoolId,
                'staffId': mongoose.Types.ObjectId(staffId)
            };
            KlassSectionSubject.findOne(query)
                .lean()
                .exec(function (err, klassSectionSubjectData) {
                    if (err) {
                        return next(err);
                    }
                    if (klassSectionSubjectData) {
                        staffEditData.canDeleteStaff = false;
                    }
                    next();
                });
        }

    ], function (err, data) {
        if (err) {
            return handleError(res, err)
        }

        return res.send(200, staffEditData);
    });
};


//inputData:{
// userData:{"_id", "profilePictureUrl", "name", "email", "mobileNumber", "matchedUserId"},
// staffData:{"_id", "DOB", "address", "city", "isPrincipal","specialization"},
// isSchoolAdmin : true|false
// }
function updateAndRetrieveStaffData(loggedUserData, inputData, callback) {

    var staffInputData = inputData.staffData;
    var userInputData = inputData.userData;

    async.waterfall([

        function (next) {

            var query = {'_id': mongoose.Types.ObjectId(staffInputData._id)};

            var updateData = _.pick(staffInputData, ["DOB", "address", "city", "isPrincipal","specialization"]);
            updateData.DOB = new Date(staffInputData.DOB);
            updateData.specialization = _.map(staffInputData.specialization, function (schoolSubjectId) {
                return mongoose.Types.ObjectId(schoolSubjectId);
            });
            if(userInputData.matchedUserId){
                updateData.userId = mongoose.Types.ObjectId(userInputData.matchedUserId);
            }
            auditManager.populateUpdateAudit(loggedUserData, updateData);
            Staff.update(query, {$set: updateData}, function (err, result) {
                return next(err);
            });
        },

        function (next) {

            var staffId = mongoose.Types.ObjectId(staffInputData._id);
            Staff.findById(staffId)
                .lean()
                .exec(next);
        }

    ], callback);
}


function updateStaffUserData(loggedUserData, inputData, callback) {

    var userInputData = inputData.userData;
    if (!userInputData.matchedUserId) {
        async.waterfall([

            function(next){
                updateAndRetrieveStaffData(loggedUserData, inputData, next);
            },

            function(updatedStaffData, next){
                var query = {'_id': mongoose.Types.ObjectId(userInputData._id)};
                var userData = _.pick(userInputData, ["name", "email", "mobileNumber"]);
                auditManager.populateUpdateAudit(loggedUserData, userData);
                User.update(query, {$set: userData}, function (err, result) {
                    next(err, updatedStaffData);
                });
            }

        ], callback);

    }else{

        async.waterfall([

            function (next) {

                var UserRoleTypes = Constants.UserRoleTypes;
                var deleteInputData = {
                    'roleId': UserRoleTypes.STAFF.roleId,
                    'userId': mongoose.Types.ObjectId(userInputData._id),
                    'loggedUserData': loggedUserData
                };
                SchoolUserRole.removeDependents(deleteInputData, function (err, data) {
                    if(err) return next(err);

                    var removeQuery = {
                        'userId': mongoose.Types.ObjectId(userInputData._id),
                        'roomId': loggedUserData.schoolId
                    };
                    ChatRoom.remove(removeQuery, function (err, data) {
                        return next(err);
                    });
                });
            },

            function (next) {

                updateAndRetrieveStaffData(loggedUserData, inputData, next);
            },

            function(updatedStaffData, next){

                var UserRoleTypes = Constants.UserRoleTypes;
                var schoolUserRoleData = {
                    'roleId': UserRoleTypes.STAFF.roleId,
                    'userId': mongoose.Types.ObjectId(updatedStaffData.userId)
                };
                auditManager.populateCreationAccountAudit(loggedUserData, schoolUserRoleData);
                SchoolUserRole.create(schoolUserRoleData, function (err, result) {
                    next(err, updatedStaffData);
                });
            },

            function(updatedStaffData, next){

                var chatRoomObj = {
                    'userId': updatedStaffData.userId,
                    'roomId': loggedUserData.schoolId,
                    'name': updatedStaffData.name
                };
                auditManager.populateCreationAccountAudit(loggedUserData, chatRoomObj);
                ChatRoom.create(chatRoomObj, function (err, result) {
                    next(err, updatedStaffData);
                });
            }

        ], callback);
    }
}


//inputData:{
// userData:{"_id", "profilePictureUrl", "name", "email", "mobileNumber"},
// staffData:{"_id", "DOB", "address", "city", "isPrincipal","specialization"},
// isSchoolAdmin : true|false
// }
exports.updateEditStaffDetails = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;

    var inputData = req.body;
    var UserRoleTypes = Constants.UserRoleTypes;

    async.waterfall([

        function (next) {

            updateStaffUserData(loggedUserData, inputData, next);
        },


        function (updatedStaffData, next) {

            var query = {
                'schoolId': schoolId,
                'userId': mongoose.Types.ObjectId(updatedStaffData.userId)
            };
            SchoolUserRole.find(query)
                .lean()
                .exec(function(err, activeSchoolUserRoles){
                    return next(err, updatedStaffData, activeSchoolUserRoles);
                });
        },

        //If the editedStaff is slected as pincipal then unset the previous principal from 'Staff'
        function (updatedStaffData, activeSchoolUserRoles, next) {

            var hasPrincipalRole = _.find(activeSchoolUserRoles, {'roleId': UserRoleTypes.PRINCIPAL.roleId});
            if (!updatedStaffData.isPrincipal || hasPrincipalRole) {
                return next(null, updatedStaffData, activeSchoolUserRoles);
            }

            var query = {
                'schoolId': schoolId,
                'isPrincipal': true,
                '_id':{$ne:mongoose.Types.ObjectId(updatedStaffData._id)}
            };
            var updateData = {isPrincipal: false};
            auditManager.populateUpdateAudit(loggedUserData, updateData);
            Staff.update(query, {$set: updateData}, function (err, result) {
                next(err, updatedStaffData, activeSchoolUserRoles);
            });
        },

        //If the editedStaff is slected as pincipal then remove the
        // previous principal role(anyway previous pricipal can act as staff)
        function (updatedStaffData, activeSchoolUserRoles, next) {

            var hasPrincipalRole = _.find(activeSchoolUserRoles, {'roleId': UserRoleTypes.PRINCIPAL.roleId});
            if (!updatedStaffData.isPrincipal || hasPrincipalRole) {
                return next(null, updatedStaffData, activeSchoolUserRoles);
            }

            var query = {
                'schoolId': schoolId,
                'userId':{$ne:mongoose.Types.ObjectId(updatedStaffData._id)},
                'roleId': UserRoleTypes.PRINCIPAL.roleId
            };
            SchoolUserRole.remove(query, function (err, result) {
                next(err, updatedStaffData, activeSchoolUserRoles);
            });
        },


        //If the editedStaff is deslected from SCHOOL_ADMIN then remove the
        //currentUser from School_Admin role
        function (updatedStaffData, activeSchoolUserRoles, next) {

            var newSchoolUserRoleList = [];
            var hasPrincipalRole = _.find(activeSchoolUserRoles, {'roleId': UserRoleTypes.PRINCIPAL.roleId});
            if (updatedStaffData.isPrincipal && !hasPrincipalRole) {
                newSchoolUserRoleList.push(UserRoleTypes.PRINCIPAL.roleId);
            }

            var hasSchoolAdminRole = _.find(activeSchoolUserRoles, {'roleId': UserRoleTypes.SCHOOL_ADMIN.roleId});
            if (inputData.isSchoolAdmin && !hasSchoolAdminRole) {
                newSchoolUserRoleList.push(UserRoleTypes.SCHOOL_ADMIN.roleId);
            }

            if (newSchoolUserRoleList.length == 0) {
                return next(null, updatedStaffData, activeSchoolUserRoles);
            }


            var newSchoolUserRoleDataList = _.map(newSchoolUserRoleList, function (roleId) {
                var newSchoolUserRoleData = {
                    'roleId': roleId,
                    'userId': mongoose.Types.ObjectId(updatedStaffData.userId)
                };
                auditManager.populateCreationAccountAudit(loggedUserData, newSchoolUserRoleData);
                return newSchoolUserRoleData;
            });
            SchoolUserRole.create(newSchoolUserRoleDataList, function (err, result) {
                next(err, updatedStaffData, activeSchoolUserRoles);
            });
        },

        //If the editedStaff is slected as pincipal then create new role as 'Principal'.. he already act as staff also
        function (updatedStaffData, activeSchoolUserRoles, next) {

            var removedSchoolUserRoleList = [];
            var hasPrincipalRole = _.find(activeSchoolUserRoles, {'roleId': UserRoleTypes.PRINCIPAL.roleId});
            if (!updatedStaffData.isPrincipal && hasPrincipalRole) {
                removedSchoolUserRoleList.push(UserRoleTypes.PRINCIPAL.roleId);
            }

            var hasSchoolAdminRole = _.find(activeSchoolUserRoles, {'roleId': UserRoleTypes.SCHOOL_ADMIN.roleId});
            if (!inputData.isSchoolAdmin && hasSchoolAdminRole) {
                removedSchoolUserRoleList.push(UserRoleTypes.SCHOOL_ADMIN.roleId);
            }

            if (removedSchoolUserRoleList.length == 0) {
                return next(null);
            }

            var removeQuery = {
                schoolId: schoolId,
                roleId: {$in: removedSchoolUserRoleList},
                userId: mongoose.Types.ObjectId(updatedStaffData.userId)
            };
            SchoolUserRole.remove(removeQuery, function (err, result) {
                next(err);
            });
        }
        
    ], function (err) {

        if (err) {
            return handleError(res, err)
        }

        return res.send(200, 'Successfully updated staff');
    });
};


//output --> {
//    'result':[
//         {'klassSectionId','klassSectionName', 'subjectNameList', 'isKlassTeacher', 'isStaffTeacher'},
//         {}, ..
//        ]
//     }
exports.getKlassSectionInfoList = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;
    var resultData = {
        'result': []
    };

    async.waterfall([

        function (next) {

            var query = {
                'userId': loggedUserData.userId,
                'schoolId': loggedUserData.schoolId
            };
            Staff.findOne(query)
                .lean()
                .exec(next);
        },


        function (staffData, next) {

            var query = {
                'staffId': staffData._id,
                'academicYearId': academicYearData._id
            };
            KlassSectionSubject.find(query)
                .populate(["klassSectionId", "subjectTypeId"])
                .lean()
                .exec(function (err, klassSectionSubjectList) {
                    return next(err, staffData, klassSectionSubjectList);
                });
        },

        //find his own klass section
        function (staffData, klassSectionSubjectList, next) {
            var query = {'staffId': staffData._id};
            KlassSection.findOne(query)
                .lean()
                .exec(function (err, ownKlassSection) {
                    return next(err, klassSectionSubjectList, ownKlassSection);
                });
        },

        function (klassSectionSubjectList, ownKlassSection, next) {
            var klassSectionIdToInfoMapper = {};
            if (ownKlassSection) {
                klassSectionIdToInfoMapper[ownKlassSection._id] = {
                    'klassSectionId': ownKlassSection._id,
                    'klassSectionName': ownKlassSection.klassSectionName,
                    'subjectNameList': [],
                    'isKlassTeacher': true,
                    'isStaffTeacher': false
                };
            }
            _.each(klassSectionSubjectList, function (klassSectionSubjectData) {
                var klassSectionData = klassSectionSubjectData.klassSectionId;//populated field
                var subjectTypeData = klassSectionSubjectData.subjectTypeId;//populated field
                var subjectKlassSectionId = klassSectionData._id;
                var loggedUserKlassSectionInfo = klassSectionIdToInfoMapper[subjectKlassSectionId] || {
                        'klassSectionId': subjectKlassSectionId,
                        'klassSectionName': klassSectionData.klassSectionName,
                        'subjectNameList': [],
                        'isKlassTeacher': false,
                        'isStaffTeacher': true
                    };
                loggedUserKlassSectionInfo.subjectNameList.push(subjectTypeData.subjectName);
                klassSectionIdToInfoMapper[subjectKlassSectionId] = loggedUserKlassSectionInfo;
            });
            var loggedUserKlassSectionInfoList = _.values(klassSectionIdToInfoMapper);
            loggedUserKlassSectionInfoList = _.map(loggedUserKlassSectionInfoList, function (sectionInfo) {
                sectionInfo.sectionDisplayName = sectionInfo.klassSectionName;
                if (sectionInfo.isKlassTeacher)sectionInfo.sectionDisplayName = sectionInfo.klassSectionName + " - Class Teacher";
                return sectionInfo;
            })
            resultData.result = loggedUserKlassSectionInfoList;
            return next();
        }

    ], function done(err) {

        if (err) {
            return handleError(res, err)
        }

        return res.send(200, resultData);
    });
};


exports.getKlassSectionLoginToken = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var tokenInputData = {
        'userId': loggedUserData.userId,
        'klassSectionId': req.params.klassSectionId
    };
    var token = auth.signToken(tokenInputData);
    return res.json({token: token});
};


exports.getAllSchoolColleagueList = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var loggedUserId = loggedUserData.userId;
    var schoolId = loggedUserData.schoolId;

    async.waterfall([

        function (next) {

            var query = {
                'schoolId': schoolId,
                'userId': {'$ne': loggedUserId},
                'isDeleted': false
            };
            Staff.find(query)
                .lean()
                .exec(next);
        },

        function (schoolColleagueStaffList, next) {

            var schoolColleagueStaffUserIdList = _.map(schoolColleagueStaffList, 'userId');
            var query = {
                'schoolId': schoolId,
                '_id': {$in: schoolColleagueStaffUserIdList}
            };
            User.find(query)
                .lean()
                .exec(function (err, data) {
                    return next(err, schoolColleagueStaffList, data);
                });
        },

        function (schoolColleagueStaffList, userList, next) {

            var userIdMapper = {};
            _.each(userList, function (userData) {
                userIdMapper[userData._id] = userData;
            });

            _.each(schoolColleagueStaffList, function (staffData) {
                var userData = userIdMapper[staffData.userId];
                staffData.staffName = userData.name;
                staffData.staffMobileNumber = userData.mobileNumber;
                staffData.staffEmail = userData.email;
                staffData.staffProfilePic = userData.profilePictureUrl;
            });
            schoolColleagueStaffList = _.sortBy(schoolColleagueStaffList, "staffName");
            return next(null, schoolColleagueStaffList);
        }


    ], function done(err, schoolColleagueStaffList) {

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send(schoolColleagueStaffList)
    });
};

exports.getAllKlassSectionColleagueList = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;
    var schoolId = loggedUserData.schoolId;
    var loggedUserId = loggedUserData.userId;
    var klassSectionId = req.params.klassSectionId;

    async.waterfall([

        function (next) {

            var query = {
                'schoolId': schoolId,
                'klassSectionId': klassSectionId,
                'academicYearId': academicYearData._id
            };
            KlassSectionSubject.find(query)
                .lean()
                .exec(next);
        },

        function (klassSectionSubjectList, next) {

            var staffIdList = _.map(klassSectionSubjectList, "staffId");
            var query = {
                'schoolId': schoolId,
                'userId': {'$ne': loggedUserId},
                '_id': {'$in': staffIdList},
                'isDeleted': false
            };
            Staff.find(query)
                .lean()
                .exec(next);
        },

        function (klassSectionColleagueStaffList, next) {

            var schoolColleagueStaffUserIdList = _.map(klassSectionColleagueStaffList, 'userId');
            var query = {
                'schoolId': schoolId,
                '_id': {$in: schoolColleagueStaffUserIdList}
            };
            User.find(query)
                .lean()
                .exec(function (err, data) {
                    return next(err, klassSectionColleagueStaffList, data);
                });
        },

        function (klassSectionColleagueStaffList, userList, next) {

            var userIdMapper = {};
            _.each(userList, function (userData) {
                userIdMapper[userData._id] = userData;
            });

            _.each(klassSectionColleagueStaffList, function (staffData) {
                var userData = userIdMapper[staffData.userId];
                staffData.staffName = userData.name;
                staffData.staffMobileNumber = userData.mobileNumber;
                staffData.staffEmail = userData.email;
                staffData.staffProfilePic = userData.profilePictureUrl;
            });
            klassSectionColleagueStaffList = _.sortBy(klassSectionColleagueStaffList, 'staffName');
            return next(null, klassSectionColleagueStaffList);
        }


    ], function done(err, klassSectionColleagueStaffList) {

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send(klassSectionColleagueStaffList)
    });
};


exports.updateStaffDelete = function (req, res) {

    var loggedUserData = req.loggedUserData;

    async.waterfall([

        function (next) {

            var staffId = mongoose.Types.ObjectId(req.params.staffId);
            Staff.findById(staffId)
                .lean()
                .exec(next);
        },

        function (staffData, next) {

            var query = {
                '_id': mongoose.Types.ObjectId(req.params.staffId),
                'schoolId': loggedUserData.schoolId
            };
            var updateData = {isDeleted: true};
            auditManager.populateUpdateAudit(loggedUserData, updateData);

            Staff.update(query, {$set: updateData}, function (err, data) {
                return next(err, staffData);
            });
        },

        function (staffData, next) {

            var UserRoleTypes = Constants.UserRoleTypes;
            var deleteInputData = {
                'roleId': UserRoleTypes.STAFF.roleId,
                'userId': mongoose.Types.ObjectId(staffData.userId),
                'loggedUserData': loggedUserData
            };

            SchoolUserRole.removeDependents(deleteInputData, function (err, data) {
                return next(err);
            });
        }

    ], function done(err) {

        if (err) {
            return handleError(res, err)
        }

        return res.status(200).send('Success');
    });
};


exports.getUnassignedStaffList = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;

    async.waterfall([

        function (next) {

            var query = {'schoolId': schoolId};
            KlassSection.find(query)
                .lean()
                .exec(next);
        },


        function (klassSectionList, next) {

            var query = {'schoolId': schoolId, 'isDeleted': false};
            Staff.find(query)
                .lean()
                .exec(function (err, staffList) {
                    return next(err, klassSectionList, staffList);
                });
        },

        function (klassSectionList, staffList, next) {

            var assignedStaffIdListMapper = {};
            _.each(klassSectionList, function (klassSectionData) {
                assignedStaffIdListMapper[klassSectionData.staffId] = klassSectionData;
            });

            var unassignedStaffList = _.filter(staffList, function (staffData) {
                var staffId = staffData._id;
                var klassSectionData = assignedStaffIdListMapper[staffId];
                return (klassSectionData == null) ? true : false;
            });


            var staffUserIdList = _.map(unassignedStaffList, 'userId');
            var query = {
                'schoolId': schoolId,
                '_id': {$in: staffUserIdList}
            };

            User.find(query)
                .lean()
                .exec(function (err, userList) {
                    return next(err, unassignedStaffList, userList);
                });
        },

        function (unassignedStaffList, userList, next) {

            var userIdMapper = {};
            _.each(userList, function (userData) {
                userIdMapper[userData._id] = userData;
            });

            _.each(unassignedStaffList, function (staffData) {
                var userData = userIdMapper[staffData.userId];
                staffData.name = userData.name.toLowerCase();
                staffData.mobileNumber = userData.mobileNumber;
                staffData.email = userData.email;
            });
            unassignedStaffList = _.sortBy(unassignedStaffList, 'name');
            _.map(unassignedStaffList, function (staff) {
                var staffName = staff.name.toLowerCase();
                staff.name = staffName.substring(0, 1).toUpperCase() + staffName.substring(1);
                return staff;
            });
            return next(null, unassignedStaffList);
        }


    ], function done(err, unassignedStaffList) {

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send(unassignedStaffList)
    });
};


exports.findStaffsByImportData = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var inputData = req.body;
    var importedDataList = inputData.importedData;

    var resultData = {
        'mobileNumberMatchedUserList': []
    };

    async.waterfall([

        function (next) {

            var mobileNumberList = [];
            _.each(importedDataList, function (data) {
                mobileNumberList.push(data.mobileNumber);
            });
            if (mobileNumberList.length == 0) {
                return next();
            }

            var query = {
                'schoolId': {'$ne': loggedUserData.schoolId},
                'isDeleted': false,
                'mobileNumber': {$in: mobileNumberList}
            };
            User.find(query)
                .lean()
                .exec(function (err, mobileNumberMatchedUserList) {
                    if (err) return next(err);

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


function handleError(res, err) {
    return res.status(500).send(err);
}
