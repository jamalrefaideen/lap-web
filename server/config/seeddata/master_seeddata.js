var async = require("async");
var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');

var SchoolCalendarUtil = require('../../api/schoolcalendar/schoolcalendar.util');
var SchoolCalendar = require("../../api/schoolcalendar/schoolcalendar.model");

function generate() {

    return new Promise(function (resolve, reject) {

        resetAllMappers()
            .then(generateSchoolCalender)
            .then(function () {
                console.log('master seed data generated now...');
                resolve('master seed data generated now...');
            }).catch(function (err) {
                console.log('Got an error while creating master seed data');
                reject(new Error('Got an error while creating master seed data'));
            });
    });
}


////////////////// START of private methods



function resetAllMappers() {

    return Promise.all([
        SchoolCalendar.remove()
    ]);
}


function generateSchoolCalender() {

    var dbData = [];
    var fromDate = new Date('01/01/2017');
    var toDate = new Date('12/31/2018');
    var timeDiff = Math.abs(toDate.getTime() - fromDate.getTime());
    var dayDiffCount = Math.ceil(timeDiff / (1000 * 3600 * 24));

    var schoolCalendarIdRange = 75000;
    for (var i = 0; i <= dayDiffCount; i++) {
        var schoolCalendarDate = new Date(fromDate);
        schoolCalendarDate.setDate(schoolCalendarDate.getDate() + i);
        var schoolCalendarIdSuffix = schoolCalendarIdRange+i;
        var schoolCalendarId = "596393970148403c095" + schoolCalendarIdSuffix;
        var calendarDbObj = {
            '_id': mongoose.Types.ObjectId(schoolCalendarId),
            date: schoolCalendarDate,
            dayIndex: SchoolCalendarUtil.findDayIndexOfYear(schoolCalendarDate),
            monthIndex: schoolCalendarDate.getMonth(),
            year: schoolCalendarDate.getFullYear(),
            createdOn: new Date()
        };

        dbData.push(calendarDbObj);
    }
    return new Promise(function (resolve, reject) {
        SchoolCalendar.create(dbData, function (err, data) {
            if(err) return reject(err);
            return resolve(data);
        });
    });
}

exports.generate = generate;



