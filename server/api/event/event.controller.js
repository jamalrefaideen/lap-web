'use strict';
var async = require('async');
var _ = require('lodash');
var mongoose = require("mongoose");
var Promise = require('bluebird');
// set Promise provider to bluebird
require('mongoose').Promise = require('bluebird');
var moment = require('moment');


var Constant = require("../dataconstants/constants");
var UserRoleTypes = Constant.UserRoleTypes;
var auditManager = require('../../config/auditmanager');

var Event = require('./event.model');
var SchoolCalendar = require("../schoolcalendar/schoolcalendar.model");
var SchoolCalendarUtil = require("../schoolcalendar/schoolcalendar.util");
var EventTargetType = require('../eventtargettype/eventtargettype.model');
var EventTargetTypeInstance = require('../eventtargettypeinstance/eventtargettypeinstance.model');
var Parent = require('../parent/parent.model');
var User = require('../user/user.model');
var Student = require('../student/student.model');




exports.createEvent = function (req, res) {

    var loggedUserData = req.loggedUserData;

    var inputData = req.body;
    var eventData = inputData.eventData;
    var targetTypeId = inputData.targetTypeId;
    var userList = inputData.userList;

    async.waterfall([

        function (next) {

            var eventDate = eventData.eventDate;
            SchoolCalendar.findByDate(eventDate, next);
        },

        function (schoolCalenderData, next) {

            var eventObj = {
                'eventTitle': eventData.eventTitle,
                'eventDescription': eventData.eventDescription,
                'eventLocation': eventData.eventLocation,
                'startTime': eventData.startTime,
                'endTime': eventData.endTime,
                'isFullDay': eventData.isFullDay,
                'schoolCalendarId': schoolCalenderData._id
            };
            auditManager.populateCreationAccountAudit(loggedUserData, eventObj);
            Event.create(eventObj, next);
        },

        function (eventInstance, next) {

            var eventTargetTypeInputData = {
                targetTypeId: targetTypeId,
                eventId: eventInstance._id
            };
            auditManager.populateCreationAccountAudit(loggedUserData, eventTargetTypeInputData);
            EventTargetType.create(eventTargetTypeInputData, next)
        },

        //find event parents/staffs using inputUserList and targetTypeId
        //And include the loggedUser in the eventTargetUserList. Then only he can view the event from calandar
        function (eventTargetTypeInnstanceData, next) {
            findEventTargetUserList(targetTypeId, userList, loggedUserData)
                .then(function (eventTargetUserList) {
                    var currentUser = _.find(eventTargetUserList, function (user) {
                        return user.userId.toString() == loggedUserData.userId.toString();
                    });
                    if (!currentUser) {
                        eventTargetUserList.push({
                            userId: loggedUserData.userId
                        });
                    }
                    return next(null, eventTargetTypeInnstanceData, eventTargetUserList)
                })
                .catch(next);
        },

        //find notification users using list of user ids
        function (eventTargetTypeInnstanceData, eventTargetUserList, next) {

            var eventTargetTypeInstances = _.map(eventTargetUserList, function (user) {
                var instanceObj = {
                    eventId: eventTargetTypeInnstanceData.eventId,
                    eventTargetTypeId: eventTargetTypeInnstanceData._id,
                    userId: mongoose.Types.ObjectId(user.userId)
                };
                if(user.studentId) instanceObj.studentId = mongoose.Types.ObjectId(user.studentId);
                auditManager.populateCreationAccountAudit(loggedUserData, instanceObj);
                return instanceObj;
            });

            EventTargetTypeInstance.create(eventTargetTypeInstances, next);
        }

    ], function done(err, eventTargetTypeInstanceList) {

        if (err) {
            return handleError(res, err)
        }

        return res.send(200, 'success');
    });
};





//userList: Can be either studentList or staffList
//Here include principal if targetType is either ALL_STUDENTS and ALL_TEACHERS
function findEventTargetUserList(targetTypeId, userList, loggedUserData) {

    var EventTargetType = _.clone(Constant.EventTargetType);
    var studentNotificationTypeIds = [EventTargetType.SECTION_STUDENTS.typeId, EventTargetType.SELECTED_SECTION_STUDENTS.typeId];
    if (studentNotificationTypeIds.indexOf(targetTypeId) != -1) {
        return findEventTargetUsersByStudentList(targetTypeId, userList, loggedUserData);
    }

    //This is for ALL/SELECTED TEACHERS
    return new Promise(function (resolve, reject) {
        var notificationUserList = _.map(userList, function (staffUserData) {
            return {'userId': staffUserData.userId};
        });
        if (targetTypeId == EventTargetType.SECTION_TEACHERS.typeId) {// is target type is all teacher
            notificationUserList.push({'userId':loggedUserData.schoolPrincipalUserId});
        }
        return resolve(notificationUserList);
    });
}


function findEventTargetUsersByStudentList(targetTypeId, studentList, loggedUserData) {

    return new Promise(function (resolve, reject) {

            var EventTargetType = _.clone(Constant.EventTargetType);
            if (EventTargetType.SELECTED_SECTION_STUDENTS.typeId == targetTypeId) { // SELECTED_STUDENTS

                var parentIdList = _.map(studentList, 'parentId');
                var query = {
                    'schoolId': loggedUserData.schoolId,
                    '_id': {'$in': parentIdList}
                };
                Parent.find(query)
                    .lean()
                    .exec(function (err, parentList) {

                        if (err) return reject(err);

                        var studentTargetUserList = constructStudenrTargetUserList(parentList, studentList);
                        return resolve(studentTargetUserList);
                    });

            } else { // ALL_STUDENTS

                async.waterfall([

                    function (next) {

                        var query = {'schoolId': loggedUserData.schoolId};
                        Student.find(query)
                            .lean()
                            .exec(function (err, docs) {

                                if (err) return next(err);

                                var allStudentList = _.map(docs, function (student) {
                                    student.studentId = student._id.toString();
                                    return student;
                                });
                                next(null, allStudentList);
                            });
                    },


                    function (allStudentList, next) {

                        var query = {
                            'schoolId': loggedUserData.schoolId
                        };
                        Parent.find(query)
                            .lean()
                            .exec(function (err, parentList) {
                                return next(err, allStudentList, parentList)
                            });
                    }

                ], function done(err, allStudentList, parentList) {

                    if (err) return reject(err);

                    var studentTargetUserList = constructStudenrTargetUserList(parentList, allStudentList);
                    studentTargetUserList.push({
                        userId : loggedUserData.schoolPrincipalUserId
                    });
                    return resolve(studentTargetUserList);
                });

            }
        }
    );
}



function constructStudenrTargetUserList(parentList, studentList) {

    var parentIdMapper = {};
    _.each(parentList, function (parentData) {
        parentIdMapper[parentData._id] = parentData;
    });

    var studentTargetUserList = [];
    _.each(studentList, function (student) {
        var parentData = parentIdMapper[student.parentId];
        studentTargetUserList.push({ //primaryParentNotificationInstData
            'userId': parentData.userId.toString(),
            'studentId': student.studentId
        });

        if(parentData.secondaryUserId){
            studentTargetUserList.push({ //secondaryParentNotificationInstData
                'userId': parentData.secondaryUserId.toString(),
                'studentId': student.studentId
            });
        }
    });

    return studentTargetUserList;
}




//inputData: {
//              monthIndex
//              year
//          }
exports.fetchEventByMonthIndex = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var monthIndex = req.params.monthIndex;
    var year = req.params.year;
    var studentId = req.params.studentId;
    var monthAndYear = {
        monthIndex: monthIndex,
        year: year
    };
    

    async.waterfall([

        function (next) {

            var findQuery = {
                'monthIndex': monthIndex,
                'year': year
            };
            SchoolCalendar.find(findQuery)
                .lean()
                .exec(next);
        },

        function (schoolCalenderList, next) {

            var schoolCalenderIdList = _.map(schoolCalenderList, "_id");
            var findQuery = {
                'schoolCalenderIdList': schoolCalenderIdList,
                'loggedUserData': loggedUserData,
                "studentId": req.params.studentId
            };
            findByLoggedUserAndSchoolCalendarForCalendarScreen(findQuery, function (err, eventList) {
                if (err) {
                    return next(err)
                }
                return next(err, schoolCalenderList, eventList);
            });
        },

        function (schoolCalenderList, eventList, next) {

            var momentDateFormat = SchoolCalendarUtil.getMomentDateFormatForAgendaEvents();
            var schoolCalenderId2DateMapper = {};
            _.each(schoolCalenderList, function (schoolCalenderData) {
                var calenderDate = new Date(schoolCalenderData.date);
                schoolCalenderId2DateMapper[schoolCalenderData._id] = SchoolCalendarUtil.formatDateByMoment(calenderDate, momentDateFormat);
            });


            var groupedEventLisBySchoolCalednder = _.groupBy(eventList, "schoolCalendarId");
            var monthlyEventData = {};
            _.each(groupedEventLisBySchoolCalednder, function (groupedEventList, schoolCalendarId) {
                var calenderDateStr = schoolCalenderId2DateMapper[schoolCalendarId];
                monthlyEventData[calenderDateStr] = groupedEventList;
            });

            var daysInCurrentMonth = SchoolCalendarUtil.getDaysArrayByMonth(monthAndYear);
            var initialMonthlyEvents = {};
            daysInCurrentMonth.forEach(function (date) {
                initialMonthlyEvents[date] = [];
            });/// {22-4-2017:[],22-4-67:[]}

            /// the strategy used here is first we find all dates in a given month and put an empty array against each.
            // Then we merge that with the found events

            let finalEvents = _.extend({}, initialMonthlyEvents, monthlyEventData);
            return next(null, finalEvents);
        }

    ], function done(err, finalEvents) {

        if (err) {
            return handleError(res, err)
        }


        return res.status(200).send(finalEvents);
    });
};




//inputData:{schoolCalenderIdList, loggedUserData, studentId(optional)}
function findByLoggedUserAndSchoolCalendarForCalendarScreen(inputData, callback) {

    var loggedUserData = inputData.loggedUserData;
    var processData = {
        'eventIdMapper': {},
        'eventTagrgetTypeIdMapper': {},
        'eventIdToTargetInstanceListMapper': {},
        'studentIdMapper': {},
        'userIdMapper': {}
    };

    async.waterfall([


            function (next) {

                var eventQuery = {
                    'schoolCalendarId':{$in:inputData.schoolCalenderIdList},
                    'schoolId': mongoose.Types.ObjectId(loggedUserData.schoolId)
                };

                Event.find(eventQuery)
                    .populate(['createdBy','schoolCalendarId'])
                    .lean()
                    .exec(function (err, eventList) {

                        if (err) {
                            return next(err);
                        }

                        var eventIdMapper = {};
                        _.each(eventList, function (eventData) {
                            eventData.eventDate = moment(eventData.schoolCalendarId.date).format("YYYY-MM-DD");
                            eventData.schoolCalendarId = eventData.schoolCalendarId._id;
                            eventIdMapper[eventData._id] = eventData;
                        });
                        processData.eventIdMapper = eventIdMapper;
                        next(err, eventList);
                    });
            },

            function (eventList, next) {

                var eventIdList = _.map(eventList, "_id");
                var eventQuery = {
                    'eventId':{$in:eventIdList},
                    'userId': mongoose.Types.ObjectId(loggedUserData.userId),
                    'schoolId': mongoose.Types.ObjectId(loggedUserData.schoolId)
                };
                if (inputData.studentId) eventQuery.studentId = mongoose.Types.ObjectId(inputData.studentId);


                EventTargetTypeInstance.find(eventQuery)
                    .lean()
                    .exec(next);
            },


            function (eventTargetInstanceList, next) {

                var eventTargetTypeIdList = _.map(eventTargetInstanceList, "eventTargetTypeId");
                EventTargetType.find({'_id': {$in: eventTargetTypeIdList}})
                    .lean()
                    .exec(function (err, eventTargetTypeList) {

                        if (err) {
                            return next(err);
                        }

                        var eventTagrgetTypeIdMapper = {};
                        _.each(eventTargetTypeList, function (eventTargetTypeData) {
                            eventTagrgetTypeIdMapper[eventTargetTypeData._id] = eventTargetTypeData;
                        });
                        processData.eventTagrgetTypeIdMapper = eventTagrgetTypeIdMapper;
                        next(err, eventTargetTypeList, eventTargetInstanceList);
                    });
            },

            function (eventTargetTypeList, eventTargetInstanceList, next) {

                var EventTargetTypeConst = _.clone(Constant.EventTargetType, true);
                var selectedEventTargetTypeList = _.filter(eventTargetTypeList, function(eventTargetTypeData){
                    return (eventTargetTypeData.targetTypeId==EventTargetTypeConst.SELECTED_SECTION_STUDENTS.typeId ||
                            eventTargetTypeData.targetTypeId==EventTargetTypeConst.SELECTED_SECTION_TEACHERS.typeId);
                });
                if(selectedEventTargetTypeList.length==0){
                    return next(null, eventTargetInstanceList, []);
                }

                var eventQuery = {
                    'eventTargetTypeId':{$in:_.map(selectedEventTargetTypeList, "_id")},
                    'schoolId': mongoose.Types.ObjectId(loggedUserData.schoolId)
                };
                EventTargetTypeInstance.find(eventQuery)
                    .lean()
                    .exec(function (err, allEventTargetInstanceList) {

                        if (err) {
                            return next(err);
                        }

                        processData.eventIdToTargetInstanceListMapper = _.groupBy(allEventTargetInstanceList, function (eventTargetInstanceData) {
                            return eventTargetInstanceData.eventId.toString();
                        });
                        next(err, eventTargetInstanceList, allEventTargetInstanceList);
                    });
            },


            function (eventTargetInstanceList, allEventTargetInstanceList, next) {

                var studentIdList = _.map(allEventTargetInstanceList, "studentId");
                Student.find({'_id': {$in: studentIdList}})
                    .lean()
                    .exec(function (err, studentList) {

                        if (err) {
                            return next(err);
                        }

                        var studentIdMapper = {};
                        _.each(studentList, function (studentData) {
                            studentIdMapper[studentData._id] = studentData;
                        });
                        processData.studentIdMapper = studentIdMapper;
                        next(err, eventTargetInstanceList, allEventTargetInstanceList);
                    });
            },

            function (eventTargetInstanceList, allEventTargetInstanceList, next) {

                var userIdList = _.map(allEventTargetInstanceList, "userId");
                User.find({'_id': {$in: userIdList}})
                    .lean()
                    .exec(function (err, userList) {

                        if (err) {
                            return next(err);
                        }

                        var userIdMapper = {};
                        _.each(userList, function (userData) {
                            userIdMapper[userData._id] = userData;
                        });
                        processData.userIdMapper = userIdMapper;
                        next(err, eventTargetInstanceList);
                    });
            },

            function (eventTargetInstanceList, next) {

                var eventIdMapper = processData.eventIdMapper;
                var eventTagrgetTypeIdMapper = processData.eventTagrgetTypeIdMapper;
                var eventIdToTargetInstanceListMapper = processData.eventIdToTargetInstanceListMapper;
                var studentIdMapper = processData.studentIdMapper;
                var userIdMapper = processData.userIdMapper;

                var eventResultFields = ['eventTitle', 'eventDescription', 'eventLocation',
                    'startTime', 'endTime', 'isFullDay', 'schoolCalendarId','_id','eventDate'];
                var EventTargetTypeConst = _.clone(Constant.EventTargetType, true);
                var eventResultList = [];
                _.each(eventTargetInstanceList, function (eventTargetInstanceData) {
                    var eventData = eventIdMapper[eventTargetInstanceData.eventId];
                    var eventTargetTypeData = eventTagrgetTypeIdMapper[eventTargetInstanceData.eventTargetTypeId];
                    if(!eventTargetTypeData){//This is data issue
                        return true;
                    }

                        var createdByObj = eventData.createdBy;//populated field
                        var createdBy = createdByObj.name;
                        var isEditable = (loggedUserData.userId.toString()==createdByObj._id.toString());

                    if (eventTargetTypeData.targetTypeId == EventTargetTypeConst.SECTION_STUDENTS.typeId) {
                        var eventResultData = _.pick(eventData, eventResultFields);
                        eventResultData.createdBy = createdBy;
                        eventResultData.isEditable = isEditable;
                        eventResultData.targetType = EventTargetTypeConst.SECTION_STUDENTS.name;
                        eventResultList.push(eventResultData);
                        return true;
                    } else if (eventTargetTypeData.targetTypeId == EventTargetTypeConst.SECTION_TEACHERS.typeId) {
                        var eventResultData = _.pick(eventData, eventResultFields);
                        eventResultData.createdBy = createdBy;
                        eventResultData.isEditable = isEditable;
                        eventResultData.targetType = EventTargetTypeConst.SECTION_TEACHERS.name;
                        eventResultList.push(eventResultData);
                        return true;
                    }

                    var targetTypeList = [];
                    var groupedEventTargetInstanceList = eventIdToTargetInstanceListMapper[eventTargetInstanceData.eventId] || [eventTargetInstanceData];
                    _.each(groupedEventTargetInstanceList, function (eventTargetInstanceData) {
                        if (eventTargetInstanceData.studentId) {
                            var studentData = studentIdMapper[eventTargetInstanceData.studentId];
                            if(studentData) targetTypeList.push(studentData.name);
                        } else if (eventTargetInstanceData.userId) {
                            var userData = userIdMapper[eventTargetInstanceData.userId];
                            if(userData) targetTypeList.push(userData.name);
                        }
                    });
                    var eventResultData = _.pick(eventData, eventResultFields);
                    eventResultData.createdBy = createdBy;
                    eventResultData.isEditable = isEditable;
                    eventResultData.targetType = targetTypeList.join(",") || '-';
                    eventResultList.push(eventResultData);
                });
                return next(null, eventResultList);
            }

        ],
        function done(err, data) {

            return callback(err, data);
        }
    );
}




//eventData: {
//              eventTitle, eventDescription, eventLocation, eventDate, startTime, endTime, isFullDay
//          }
exports.updateEventById = function (req, res) {

    var loggedUserData = req.loggedUserData;

    var eventData = req.body;
    var eventId = req.params.eventId;

    async.waterfall([

        function (next) {

            var eventDate = eventData.eventDate;
            SchoolCalendar.findByDate(eventDate, next);
        },

        function (schoolCalenderData, next) {

            var eventObj = {
                'eventTitle': eventData.eventTitle,
                'eventDescription': eventData.eventDescription,
                'eventLocation': eventData.eventLocation,
                'startTime': eventData.startTime,
                'endTime': eventData.endTime,
                'isFullDay': eventData.isFullDay,
                'schoolCalendarId': schoolCalenderData._id
            };
            auditManager.populateUpdateAudit(loggedUserData, eventObj);
            var query = {'_id':mongoose.Types.ObjectId(eventId)};
            Event.update(query, {$set:eventObj}, next);
        }

    ], function done(err) {

        if (err) {
            return handleError(res, err)
        }

        return res.send(200, 'successfully updated');
    });
};


function handleError(res, err) {
    return res.send(500, err);
}
