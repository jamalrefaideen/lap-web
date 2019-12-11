'use strict';

var async = require('async');
var _ = require('lodash');
var mongoose = require('mongoose');
var Promise = require('bluebird');
// set Promise provider to bluebird
mongoose.Promise = Promise;

var SchoolCalendar = require('./schoolcalendar.model');

exports.getMinMaxSchoolCalendarDate = function(req, res){

    var loggedUserData = req.loggedUserData;
    var resultData = {
        minDate : null,
        maxDate : null
    };

    async.series([

        function (next) {

            SchoolCalendar.find()
                .sort({date: 1})
                .limit(1)
                .exec(function(err, schoolCalendarData){

                    if (err) {
                        return next(err);
                    }

                    resultData.minDate = schoolCalendarData[0].date;
                    next();
                })

        },

        function (next) {

            SchoolCalendar.find()
                .sort({date: -1})
                .limit(1)
                .exec(function(err, schoolCalendarData){

                    if (err) {
                        return next(err);
                    }

                    resultData.maxDate = schoolCalendarData[0].date;
                    next();
                })

        }

    ],function(err,data){

        if (err) {
            return handleError(res, err)
        }
        return res.status(200).send(resultData);
    });

};