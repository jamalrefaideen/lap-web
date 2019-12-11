'use strict';

var async = require("async");
var _ = require("lodash");
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Constant = require("../dataconstants/constants");


var EventSchema = new Schema({

    schoolCalendarId: {type: Schema.Types.ObjectId, ref: 'SchoolCalendar'},
    eventTitle: String,
    eventDescription: String,
    eventLocation: String,
    startTime: String,
    endTime: String,
    isFullDay: Boolean,
    HolidayDate: Date,
    isHoliday: {type: Boolean, default: false},

    schoolId: {type: Schema.Types.ObjectId, ref: 'School'},
    createdOn: {type: Date, default: Date.now},
    modifiedOn: Date,
    createdBy: {type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: {type: Schema.Types.ObjectId, ref: 'User'}
});


//inputData: {loggedUserData, schoolCalendarId}
EventSchema.statics.findByLoggedUserAndSchoolCalendar = function (inputData, callback) {

    var EventTargetType = mongoose.model('EventTargetType');
    var EventTargetTypeInstance = mongoose.model('EventTargetTypeInstance');
    var Event = mongoose.model('Event');
    var Student = mongoose.model('Student');
    var User = mongoose.model('User');
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
                'schoolId': mongoose.Types.ObjectId(loggedUserData.schoolId)
            };
            if (Array.isArray(inputData.schoolCalendarId)) {
                eventQuery.schoolCalendarId = {$in: inputData.schoolCalendarId}
            } else {
                eventQuery.schoolCalendarId = mongoose.Types.ObjectId(inputData.schoolCalendarId)
            }
            Event.find(eventQuery)
                .populate(["createdBy", "schoolCalendarId"])
                .lean()
                .exec(function (err, eventList) {

                    if (err) {
                        return next(err);
                    }

                    var eventIdMapper = {};
                    _.each(eventList, function (eventData) {
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
                'startTime', 'endTime', 'isFullDay', 'schoolCalendarId','_id'];
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

    ], function done(err, eventList) {

        return callback(err, eventList);
    });
};


module.exports = mongoose.model('Event', EventSchema);
