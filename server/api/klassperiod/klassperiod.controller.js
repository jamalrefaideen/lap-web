'use strict';


var async = require("async");
var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
// set Promise provider to bluebird
mongoose.Promise = Promise;

var KlassPeriodService = require("./klassperiod.service");
var KlassPeriod = require('./klassperiod.model');
var KlassSectionSubject = require('../klasssectionsubject/klasssectionsubject.model');
var Timetable = require('../timetable/timetable.model');
var auditManager = require('../../config/auditmanager');


exports.updateKlassPeriodList = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var klassId = mongoose.Types.ObjectId(req.params.klassId);

    var inputData = req.body;
    var updatedKlassPeriodList = inputData.updatedKlassPeriodList;
    var deletedKlassPeriodList = inputData.deletedKlassPeriodList;

    async.waterfall([

        function(next){

            var deletedKlassPeriodIdList = _.map(deletedKlassPeriodList, '_id');
            _.each(deletedKlassPeriodIdList, function(klassPeriodId, index){
                deletedKlassPeriodIdList[index] = mongoose.Types.ObjectId(klassPeriodId);
            });
            if(deletedKlassPeriodList.length==0){
                return next(null, deletedKlassPeriodIdList);
            }
            
            var query = {
                '_id':{$in:deletedKlassPeriodIdList},
                'schoolId':schoolId,
                'klassId':klassId
            };
            KlassPeriod.remove(query, function(err){
                return next(err, deletedKlassPeriodIdList);
            });
        },

        function(deletedKlassPeriodIdList, next){

            if(deletedKlassPeriodIdList.length==0) return next();

            var query = {
                'klassPeriodId':{$in:deletedKlassPeriodIdList},
                'schoolId':schoolId
            };
            Timetable.remove(query, function(err){
                return next(err);
            });
        },
        
        function(next){

            var batch = KlassPeriod.collection.initializeUnorderedBulkOp();
            _.each(updatedKlassPeriodList, function (klassPeriodData) {
                if(klassPeriodData._id){
                    var findQuery = {_id: mongoose.Types.ObjectId(klassPeriodData._id)};
                    var klassPeriodDBData = _.pick(klassPeriodData, ["periodIndex", "fromTime", "toTime","periodType"]);
                    auditManager.populateUpdateAudit(loggedUserData, klassPeriodDBData);
                    batch.find(findQuery)
                        .updateOne({$set: klassPeriodDBData});
                }else{
                    var klassPeriodDBData = _.pick(klassPeriodData, ["periodIndex", "fromTime", "toTime","periodType"]);
                    klassPeriodDBData.klassId = klassId;
                    auditManager.populateCreationAcademicAccountAudit(loggedUserData, klassPeriodDBData);
                    batch.insert(klassPeriodDBData);
                }
            });
            batch.execute(next);
        }


    ], function done(err){

        if (err) {
            return handleError(res, err)
        }
        return res.status(200)
            .send({'message':'Successfully updated klass periods'});
    });
};


exports.createClassPeriod = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var inputData = req.body;
    var periodList = inputData.periodList;
    var klassIdList = inputData.klassIdList;
    var klassPeriodInfo = {
        schoolId: loggedUserData.schoolId,
        academicYearId: loggedUserData.academicYearData._id,
        periodList: periodList,
        loggedUserData: loggedUserData
    };

    var buildKlassPeriods = _.partial(buildKlassPeriodsMap, klassPeriodInfo);
    var klassIdPeriodsMap = _.reduce(klassIdList, buildKlassPeriods, {});

    KlassPeriodService.createPeriodsByKlass(klassPeriodInfo, klassIdPeriodsMap)
        .then(function (createdKlassPeriods) {
            res.status(200).send(createdKlassPeriods);
        })
        .catch(function (err) {
            res.status(500).send(err);
        });
};


function buildKlassPeriodsMap(klassPeriodInfo, result, klassId) {
    var loggedUserData = klassPeriodInfo.loggedUserData;
    var klassPeriodDataList = _.map(klassPeriodInfo.periodList, function (period) {
        var klassPeriodData = _.pick(period, ["periodIndex", "fromTime", "toTime","periodType"]);
        klassPeriodData.klassId = klassId;
        auditManager.populateCreationAcademicAccountAudit(loggedUserData, klassPeriodData);
        return klassPeriodData;
    });
    result[klassId] = klassPeriodDataList;
    return result;
}


exports.fetchPeriodDetailsByKlass = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var academicYearId = loggedUserData.academicYearData._id;
    var resultObj = {};
    var inputData = req.body;
    var klassId = mongoose.Types.ObjectId(inputData.klassId);
    var klassSectionId = mongoose.Types.ObjectId(inputData.klassSectionId);
    var query = {
        'klassId': klassId,
        'academicYearId': academicYearId
    };

    async.series([

        function (next) {

            KlassPeriod.find(query)
                .sort({"periodIndex": 1})
                .lean()
                .exec(function (err, klassPeriods) {
                    if (err) {
                        return next(err)
                    }
                    resultObj.klassPeriodList = klassPeriods;
                    next();
                });
        },

        function (next) {

            var query = {
                'schoolId': schoolId,
                'klassSectionId': mongoose.Types.ObjectId(klassSectionId),
                'academicYearId': mongoose.Types.ObjectId(academicYearId)
            };
            KlassSectionSubject.find(query)
                .populate('subjectTypeId')
                .lean()
                .exec(function (err, klassSectionSubjects) {
                    if (err) {
                        return next(err)
                    }
                    resultObj.klassSectionSubjectList = klassSectionSubjects;
                    next();
                })
        },

        function (next) {
            var query = {
                'schoolId': schoolId,
                'klassSectionId': mongoose.Types.ObjectId(klassSectionId),
                'academicYearId': mongoose.Types.ObjectId(academicYearId)
            };
            Timetable.find(query)
                .lean()
                .exec(function (err, timetableData) {
                    if (err) {
                        return next(err)
                    }
                    resultObj.timetableList = timetableData;
                    next();
                });
        }
    ], function (err, data) {

        if (err) {
            return handleError(res, err);
        }

        return res.send(200, resultObj);
    });

};


exports.getKlassPeriodList = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var klassId = mongoose.Types.ObjectId(req.params.klassId);
    var query = {
        'klassId': klassId,
        'academicYearId': req.loggedUserData.academicYearData._id
    };
    KlassPeriod.find(query)
        .sort({"periodIndex": 1})
        .lean()
        .exec(function (err, klassPeriods) {
            if (err) {
                return handleError(res, err)
            }
            return res.status(200).send(klassPeriods);
        });
};

exports.getPeriodCreatedKlassIds = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var query = {
        'schoolId': schoolId,
        'academicYearId': req.loggedUserData.academicYearData._id
    };
    KlassPeriod.find(query)
        .populate('klassId')
        .select('klassId')
        .lean()
        .exec(function (err, klassPeriods) {
            if (err) {
                return handleError(res, err)
            }
            var uniqueKlasses = _.uniq(klassPeriods, function (periodObj) {
                return periodObj.klassId._id.toString();
            });
            return res.status(200).send(uniqueKlasses);
        });
};


function handleError(res, err) {
    return res.status(500).send(err);
}



