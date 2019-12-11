/**
 * Created by Mathdisk on 9/13/2017.
 */

var async = require("async");
var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
mongoose.Promise = Promise;
var StaffModel = require('../staff/staff.model');
var ParentModel = require('../parent/parent.model');
var StudentModel = require('../student/student.model');
var EventTargetTypeInstance = require('../eventtargettypeinstance/eventtargettypeinstance.model');
var KlassSectionStudentModel = require('../klasssectionstudent/klasssectionstudent.model');
var EventModel = require('./event.model');


exports.createHolidayEvent = createHolidayEvent;


/**
 * create events after creating holiday
 */
function createHolidayEvent(holidayInfo, loggedUserInfo) {

    var createdEvent = null;
    var findTargetUserIds = _.partial(getTargetUsersIds, holidayInfo, loggedUserInfo);
    return createEvent(holidayInfo, loggedUserInfo)// create event
        .then(function (event) {
            createdEvent = event;
        })
        .then(findTargetUserIds)// find target user ids
        .then(function (targetUserIds) {
            return createEventTargetTypeInstances(createdEvent, targetUserIds)
        })

}


function createEvent(holidayInfo, loggedUserInfo) {
    return new Promise(function (resolve, reject) {
        var eventObj = {
            'eventTitle': holidayInfo.holidayName,
            'eventDescription': holidayInfo.holidayDescription,
            'eventLocation': null,
            'startTime': null,
            'endTime': null,
            'isFullDay': true,
            'schoolCalendarId': holidayInfo.schoolCalendarId,
            "schoolId": loggedUserInfo.schoolId,
            "createdBy": loggedUserInfo.userId,
            "createdOn": new Date(),
            "isHoliday": true,
            "HolidayDate": holidayInfo.holidayDate

        };
        EventModel.create(eventObj, function (err, event) {
            if (err) return reject(err);
            resolve(event);
        });
    })
}

function getTargetUsersIds(holidayInfo, loggedUserInfo) {
    if (holidayInfo.isAllClass) { // check holiday for all  classes
        return findEventTargetUserIdsForSchool(loggedUserInfo)
    } else {
        var klassIdList = _.map(holidayInfo.klassIdList, function (klassId) {
            return mongoose.Types.ObjectId(klassId);
        });
        return findSpecificKlassesStudentParentUserIds(klassIdList);

    }
}
/**
 * find all school staffs, principal and parent user ids () returns object with userId
 * @param loggedUserInfo
 */
function findEventTargetUserIdsForSchool(loggedUserInfo) {
    return new Promise(function (resolve, reject) {
        var schoolId = loggedUserInfo.schoolId;
        var targetUserIds = [];
        var collectParentUserIds = _.partial(collectAllParentUserIds, schoolId);
        collectAllSchoolStaffUserIds(schoolId)
            .then(function (staffUserIds) {
                targetUserIds = targetUserIds.concat(staffUserIds)
            })
            .then(collectParentUserIds)
            .then(function (parentUserIds) {
                targetUserIds = targetUserIds.concat(parentUserIds);
                resolve(targetUserIds);
            })
            .catch(function (err) {
                console.error("Error while  getting findEventTargetUserIdsForSchool: " + err);
                reject(err)
            })

    })


}

// including principal
function collectAllSchoolStaffUserIds(schoolId) {
    return StaffModel.find({schoolId: schoolId})
        .select("userId").lean()
        .then(function (staffs) {
            var staffUsers = _.map(staffs,function(staff){
                return {
                    userId : staff.userId
                }
            });
            return staffUsers
        })
}


function collectAllParentUserIds(schoolId) {
    var parentList = [];
    return ParentModel.find({schoolId: schoolId})
        .select("userId").lean()
        .then(function (docs) {
            parentList = docs;
            var parentIdList = _.map(parentList, '_id');
            var query = {parentId: {$in: parentIdList}}
            return StudentModel.find(query)
        })
        .then(function (studentList) {
            var targetUsers = [];
            _.each(studentList, function (student) {
                var parent = _.find(parentList, function (parent) {
                    return parent._id.toString() == student.parentId.toString();
                })
                targetUsers.push({
                    userId: parent.userId,
                    studentId: student._id
                })
            })
            return targetUsers;

        })
}

function findSpecificKlassesStudentParentUserIds(klassIds) {
    return KlassSectionStudentModel.find({"klassId": {"$in": klassIds}})
        .populate(["studentId", "klassSectionId"]).lean()
        .then(function (data) {
            var options = [
                {
                    path: "klassSectionId.staffId",
                    model: "Staff"
                },
                {
                    path: "studentId.parentId",
                    model: "Parent"
                }
            ]

            return KlassSectionStudentModel
                .populate(data, options)

        })
        .then(function (klassSectionStudents) {
            var targetUsers = [];
            _.each(klassSectionStudents, function (klassSectionStudent) {
                targetUsers.push({
                    userId : klassSectionStudent.studentId.parentId.userId,
                    studentId : klassSectionStudent.studentId._id
                });
                targetUsers.push({
                    userId : klassSectionStudent.klassSectionId.staffId.userId
                });
            });
            return _.uniq(targetUsers, function (targetUser) {
                if(targetUser.studentId) return targetUser.userId.toString() && targetUser.studentId.toString();
                return targetUser.userId.toString()
            })
        })
}

function createEventTargetTypeInstances(event, targetUsers) {
    return new Promise(function (resolve, reject) {
        var uniqUsers = _.uniq(targetUsers, function (targetUser) {
            if(targetUser.studentId) return targetUser.userId.toString() && targetUser.studentId.toString();
            return targetUser.userId.toString()
        })
        var eventTargetTypeInstances = _.map(uniqUsers, function (user) {
            var instanceObj = {
                eventId: event._id,
                eventTargetTypeId: null, // eventTargetTypeId is null  for holiday event
                userId: user.userId,
                studentId: user.studentId,
                schoolId: event.schoolId,
                createdBy: event.createdBy,
                createdOn: event.createdOn

            };
            return instanceObj;
        });
        EventTargetTypeInstance.create(eventTargetTypeInstances, function (err, data) {
            if (err) return reject(err);
            resolve(data);
        });
    })

}

