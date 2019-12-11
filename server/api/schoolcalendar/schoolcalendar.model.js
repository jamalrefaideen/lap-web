'use strict';

var moment = require('moment');
var _ = require('lodash');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var SchoolCalendarUtil = require("./schoolcalendar.util");

var SchoolCalendarSchema = new Schema({
    dayIndex: Number,
    monthIndex: Number,
    year: Number,
    date: Date,
    createdOn: {type: Date, default: Date.now},
    modifiedOn: Date,
    createdBy: {type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: {type: Schema.Types.ObjectId, ref: 'User'}
});


SchoolCalendarSchema.statics.findByDate = findByDate;

SchoolCalendarSchema.statics.findByDateList = function (inputDateList, callback) {

    var dateQueryList = _.map(inputDateList, function (inputDate) {
        //https://stackoverflow.com/questions/8619879/javascript-calculate-the-day-of-the-year-1-366
        var inputDateObj = new Date(inputDate);
        var dayIndex = SchoolCalendarUtil.findDayIndexOfYear(inputDate);
        var query = {
            'dayIndex': dayIndex,
            'monthIndex': inputDateObj.getMonth(),
            'year': inputDateObj.getUTCFullYear()
        };
        return query;
    });

    var SchoolCalendar = mongoose.model('SchoolCalendar');
    SchoolCalendar.find({'$or': dateQueryList})
        .lean()
        .exec(function (err, schoolCalenderList) {

            if (err) return callback(err);

            var dateStrToSchoolCalenderMapper = {};
            var momentDateFormat = SchoolCalendarUtil.getMomentDateFormat();
            _.each(schoolCalenderList, function (schoolCalenderData) {
                var calenderDate = new Date(schoolCalenderData.date);
                var dateStr = moment(calenderDate).format(momentDateFormat);
                dateStrToSchoolCalenderMapper[dateStr] = schoolCalenderData;
            });
            return callback(err, dateStrToSchoolCalenderMapper);
        });
};

SchoolCalendarSchema.statics.findBetweenDates = function (fromDate, toDate, callback) {
    findByDate(fromDate, function (err, fromSchoolCalendar) {
        if (err) return callback(err);
        if(!fromSchoolCalendar) return callback(null, []);
        findByDate(toDate, function (err, toSchoolCalendar) {
            if (err) return callback(err);
            if(!toSchoolCalendar) return callback(null, []);
            var query = {
                "date": {
                    $gte: fromSchoolCalendar.date,
                    $lte: toSchoolCalendar.date
                }
            }
            var SchoolCalendar = mongoose.model('SchoolCalendar');
            SchoolCalendar.find(query)
                .lean()
                .exec(callback);
        })
    });

};


module.exports = mongoose.model('SchoolCalendar', SchoolCalendarSchema);

function findByDate(inputDate, callback) {

    //https://stackoverflow.com/questions/8619879/javascript-calculate-the-day-of-the-year-1-366
    var inputDateObj = new Date(inputDate);
    var dayIndex = SchoolCalendarUtil.findDayIndexOfYear(inputDate);
    var query = {
        'dayIndex': dayIndex,
        'monthIndex': inputDateObj.getMonth(),
        'year': inputDateObj.getUTCFullYear()
    };
    var SchoolCalendar = mongoose.model('SchoolCalendar');
    SchoolCalendar.findOne(query)
        .lean()
        .exec(callback);
}

