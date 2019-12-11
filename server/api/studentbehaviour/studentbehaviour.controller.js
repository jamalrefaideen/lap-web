'use strict';

var async = require('async');
var _ = require('lodash');

var auditManager = require('../../config/auditmanager');
var StudentBehaviour = require('./studentbehaviour.model');
var BehaviouralScore = require('./../behaviouralscore/behaviouralscore.model');
var BehaviouralAttribute = require('./../behaviouralattribute/behaviouralattribute.model');
var AcademicYear = require('../academicyear/academicyear.model');
var SchoolCalendar = require('../schoolcalendar/schoolcalendar.model');
var mongoose = require('mongoose');
var Promise = require('bluebird');
// set Promise provider to bluebird
mongoose.Promise = Promise;

exports.getBehaviourDetailsByKlassSectionStudent = function (req, res) {

    var klassSectionStudentId = req.params.klassSectionStudentId;
    var resultObj = {totalApplauds: 0, attributeList: [], lateDates: []};

    StudentBehaviour.find({klassSectionStudentId: klassSectionStudentId})
        .populate(['behaviouralScoreId', 'behaviouralAttributeId'])
        .lean()
        .exec(function (err, behaviourList) {
            if (err) {
                return handleError(res, err)
            }

            resultObj.totalApplauds = behaviourList.length;
            var attributeNameMap = _.groupBy(behaviourList, function (behaviourObj) {
                return behaviourObj.behaviouralAttributeId.attributeName;
            });

            _.forEach(attributeNameMap, function (behaviourValues, key) {
                var attrObj = {};
                attrObj[key] = behaviourValues.length;
                resultObj.attributeList.push(attrObj);
            });

            return res.status(200).send(resultObj);
        });
};


exports.getBehaviourChartDetailsByStudent = function (req, res) {

    var klassSectionStudentId = req.params.klassSectionStudentId;
    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;

    async.waterfall([

        function (next) {

            var query = {'schoolId': schoolId};
            BehaviouralScore.find(query)
                .lean()
                .sort({'scoreValue':-1})
                .exec(next);
        },

        function (behaviouralScoreList, next) {

            var query = {'schoolId': schoolId};
            BehaviouralAttribute.find(query)
                .lean()
                .exec(function (err, behaviouralAttributeList) {
                    return next(err, behaviouralScoreList, behaviouralAttributeList);
                });
        },

        function (behaviouralScoreList, behaviouralAttributeList, next) {

            var query = {
                'schoolId': schoolId,
                'klassSectionStudentId': klassSectionStudentId
            };
            StudentBehaviour.find(query)
                .lean()
                .exec(function (err, studentBehaviourList) {

                    if (err) {
                        return next(err)
                    }


                    var resultArray = _.map(behaviouralScoreList, function (scoreObj) {
                        var scoreValueList = _.map(behaviouralAttributeList, function (attributeObj) {
                            var matchedStudentBehaviourList = _.filter(studentBehaviourList, function (behaviourObj) {
                                return behaviourObj.behaviouralAttributeId == attributeObj._id && behaviourObj.behaviouralScoreId == scoreObj._id;
                            });
                            return {
                                'x': attributeObj.attributeName,
                                'y': matchedStudentBehaviourList.count
                            };
                        });
                        return scoreValueList;
                    });
                    next(null, resultArray);
                });
        }

    ], function (err, data) {
        if (err) {
            return handleError(res, err)
        }

        return res.status(200).send(data);
    });
};


exports.getBehaviourChartDetailsBySchool = function (req, res) {

    var klassSectionStudentId = req.params.klassSectionStudentId;
    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;

    async.waterfall([

        function (next) {

            var query = {'schoolId': schoolId};
            BehaviouralScore.find(query)
                .lean()
                .sort({'scoreValue':-1})
                .exec(next);
        },

        function (behaviouralScoreList, next) {

            var query = {'schoolId': schoolId};
            BehaviouralAttribute.find(query)
                .lean()
                .exec(function (err, behaviouralAttributeList) {
                    return next(err, behaviouralScoreList, behaviouralAttributeList);
                });
        },

        function (behaviouralScoreList, behaviouralAttributeList, next) {

            var query = {
                'schoolId': schoolId
            };
            StudentBehaviour.find(query)
                .lean()
                .exec(function (err, studentBehaviourList) {

                    if (err) {
                        return next(err)
                    }


                    var resultArray = _.map(behaviouralScoreList, function (scoreObj) {
                        var scoreValueList = _.map(behaviouralAttributeList, function (attributeObj) {
                            var matchedStudentBehaviourList = _.filter(studentBehaviourList, function (behaviourObj) {
                                return behaviourObj.behaviouralAttributeId == attributeObj._id && behaviourObj.behaviouralScoreId == scoreObj._id;
                            });
                            return {
                                'x': attributeObj.attributeName,
                                'y': matchedStudentBehaviourList.count
                            };
                        });
                        return scoreValueList;
                    });
                    next(null, resultArray);
                });

            /*resultArray: [
             [{x:clean,y:count}, {x:hwork:ycount}, {x:lerning,y:count}], //heare all are based on score==good
             [{x:clean,y:count}, {x:hwork:ycount}, {x:lerning,y:count}], //heare all are based on score==v.good
             [{x:clean,y:count}, {x:hwork:ycount}, {x:lerning,y:count}] //heare all are based on score==excellent

             ]*/
        }

    ], function (err, data) {
        if (err) {
            return handleError(res, err)
        }

        return res.status(200).send(data);
    });
};

exports.saveStudentBehaviourDetails = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var inputData = req.body;
    var schoolId = loggedUserData.schoolId;
    var academicYearData = loggedUserData.academicYearData;
    var klassSectionStudentIds = _.map(inputData.studentBehaviourList, "klassSectionStudentId");

    if (klassSectionStudentIds.length == 0) {
        return res.status(200).send({result: []});
    }
    async.waterfall([

        function (next) {
            var currentDate = new Date(inputData.schoolCalendarDate);
            SchoolCalendar.findByDate(currentDate, next);
        },

        function (calendarObj, next) {
            var queryList = _.map(klassSectionStudentIds, function (klassSectionStudentId) {
                return {
                    klassSectionStudentId: klassSectionStudentId,
                    schoolCalendarId: calendarObj._id,
                    createdBy : loggedUserData.userId
                }
            })
            var removeQuery = {
                "$or": queryList
            }
            StudentBehaviour.remove(removeQuery, function (err) {
                next(err, calendarObj)
            });

        },

        function (calendarObj, next) {
            var studentBehaviourList = [];
            _.forEach(inputData.studentBehaviourList, function (studentBehaviourInfo) {
                _.each(studentBehaviourInfo.behaviourList, function (behaviour) {
                    var data = {
                        schoolCalendarId: calendarObj._id,
                        klassSectionStudentId: studentBehaviourInfo.klassSectionStudentId,
                        klassSectionId: inputData.klassSectionId,
                        schoolId: schoolId,
                        academicYearId : academicYearData._id,
                        createdBy : loggedUserData.userId,
                        createdOn : new Date()
                    }
                    data.behaviouralScoreId = behaviour.behaviouralScoreId;
                    data.behaviouralAttributeId = behaviour.behaviouralAttributeId;
                    if (data.behaviouralAttributeId && data.behaviouralScoreId) {
                        studentBehaviourList.push(data);
                    }
                });


            });
            StudentBehaviour.create(studentBehaviourList, next);

        }], function done(err, savedStudentBehaviour) {

        if (err) {
            return handleError(res, err)
        }

        return res.status(200).send(savedStudentBehaviour);
    });

};

function handleError(res, err) {
    return res.status(500).send(err);
}
