'use strict';
var _ = require("lodash");
var async = require('async');
var mongoose = require("mongoose");
var Promise = require('bluebird');
mongoose.Promise = Promise;

var BehaviouralAttribute = require('./behaviouralattribute.model');
var StudentBehaviour = require('../studentbehaviour/studentbehaviour.model');
var KlassSectionStudentModel = require('../klasssectionstudent/klasssectionstudent.model');
var BehaviouralScore = require('./../behaviouralscore/behaviouralscore.model');
var SchoolCalendar = require('../schoolcalendar/schoolcalendar.model');
var auditManager = require('../../config/auditmanager');
var AppUtil = require("../common/app.util");
var handleSuccess = AppUtil.handleSuccess;
var handleError = AppUtil.handleError;


exports.getBehaviourAttributesAndScore = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var findQuery = {
        schoolId: loggedUserData.schoolId
    };

    var resultObj = {behaviouralAttributes: [], behaviouralScores: []};

    async.waterfall([


        function (next) {

            BehaviouralAttribute.find(findQuery)
                .lean()
                .exec(function (err, attributeDatas) {

                    if (err) {
                        return handleError(res, err);
                    }
                    resultObj.behaviouralAttributes = attributeDatas;
                    next(err);
                })

        },
        function (next) {

            BehaviouralScore.find(findQuery)
                .lean()
                .sort({'scoreValue':-1})
                .exec(function (err, scoreDatas) {

                    if (err) {
                        return handleError(res, err);
                    }
                    resultObj.behaviouralScores = scoreDatas;
                    next(err);
                })

        }], function done(err, data) {

        if (err) {
            return handleError(res, err)
        }

        return res.status(200).send(resultObj);

    })


};
exports.getBehaviourAttributes = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var query = {
        schoolId: loggedUserData.schoolId
    };
    BehaviouralAttribute.find(query)
        .lean()
        .exec(function (err, BehaviourAttributeList) {

            if (err) {
                return handleError(res, err);
            }
            return res.status(200).send(BehaviourAttributeList);
        });

};


exports.createBehaviourAttribute = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var inputListData = req.body;
    _.each(inputListData, function (inputObj) {
        auditManager.populateCreationAccountAudit(loggedUserData, inputObj);
    });
    BehaviouralAttribute.create(inputListData, function (err, data) {
        if (err) {
            return handleError(res, err);
        }
        return res.status(200).send("Success");
    })


};


exports.getBehaviourAttributeById = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var behaviourAttributeId = req.params.behaviourAttributeId;

    BehaviouralAttribute.findById(behaviourAttributeId)
        .lean()
        .exec(function (err, behaviourDetails) {
            if (err) {
                return handleError(res, err);
            }

            res.send(200, behaviourDetails)
        });
};

exports.updateBehaviourAttribute = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var attributeUpdateData = req.body;
    var query = {'_id':mongoose.Types.ObjectId(attributeUpdateData._id)};

    delete attributeUpdateData._id;
    auditManager.populateUpdateAudit(loggedUserData, attributeUpdateData);
    BehaviouralAttribute.update(query, {$set: attributeUpdateData}, function (err, data) {
        if (err) {
            return handleError(res, err)
        }

        return res.send(200, 'Success');
    });
};


exports.fetchStudentsBehaviourInfo = function (req, res) {
    var loggedUserInfo = req.loggedUserData;
    var klassSectionStudentIds = _.map(req.body.klassSectionStudentIds, function (klassSectionStudentId) {
        return mongoose.Types.ObjectId(klassSectionStudentId)
    });
    var today = new Date(req.body.today);
    findSchoolCalenderId(today)
        .then(function (schoolCalender) {
            var query = {
                "_id": {"$in": klassSectionStudentIds}

            }
            return KlassSectionStudentModel.find(query).lean()
                .then(_.partial(findStudentsBehaviours, schoolCalender._id, loggedUserInfo))
        })
        .then(function (result) {
            handleSuccess(res)(result);
        })
        .catch(function (error) {
            handleError(res)(error);
        })


}

function findSchoolCalenderId(date) {
    return new Promise(function (resolve, reject) {
        SchoolCalendar.findByDate(date, function (err, calendarObj) {
            if (err) return reject(err);
            resolve(calendarObj);
        });
    });

}
function findStudentsBehaviours(schoolCalendarId, loggedUserInfo, klassSectionStudents) {
    var klassSectionStudentIds = _.map(klassSectionStudents, "_id");
    var query = {
        "klassSectionStudentId": {"$in": klassSectionStudentIds},
        "schoolCalendarId": schoolCalendarId,
        "createdBy": loggedUserInfo.userId
    }
    return StudentBehaviour.find(query)
        .lean()
        .then(function (studentBehaviours) {
            var studentsBehavioursInfo = {};
            _.each(klassSectionStudentIds, function (klassSectionStudentId) {
                studentsBehavioursInfo[klassSectionStudentId] = [];
            });
            _.each(studentBehaviours, function (studentBehaviour) {
                var studentBehaviourList = studentsBehavioursInfo[studentBehaviour.klassSectionStudentId];
                var behaviour = {
                    "behaviouralAttributeId": studentBehaviour.behaviouralAttributeId,
                    "behaviouralScoreId": studentBehaviour.behaviouralScoreId
                };
                studentBehaviourList.push(behaviour);
            });
            return studentsBehavioursInfo;
        })
}


exports.getKlassSectionLearningTraitsByBehaviourId = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;
    var klassSectionId = loggedUserData.klassSectionId;
    var behaviouralAttributeId = req.params.behaviouralAttributeId;
    if (!klassSectionId) {
        return res.send(200, []);
    }

    async.waterfall([

        function (next) {

            var query = {
                'klassSectionId': klassSectionId,
                'schoolId': loggedUserData.schoolId,
                'isDeleted': false
            };
            var KlassSectionStudent = mongoose.model("KlassSectionStudent");
            KlassSectionStudent.find(query)
                .populate("studentId")
                .lean()
                .exec(next);
        },

        function (klassSectionStudentList, next) {

            var klassSectionStudentIdList = _.map(klassSectionStudentList, "_id");
            var query = {
                'schoolId': loggedUserData.schoolId,
                'academicYearId': academicYearData._id,
                'klassSectionId': klassSectionId,
                'behaviouralAttributeId': behaviouralAttributeId,
                'klassSectionStudentId': {'$in': klassSectionStudentIdList}
            };
            var StudentBehaviour = mongoose.model('StudentBehaviour');
            StudentBehaviour.find(query)
                .lean()
                .exec(function (err, klassSectionStudentBehaviourList) {
                    return next(err, klassSectionStudentList, klassSectionStudentBehaviourList);
                });
        },

        function (klassSectionStudentList, klassSectionStudentBehaviourList, next) {

            var BehaviouralScore = mongoose.model('BehaviouralScore');
            BehaviouralScore.find({'schoolId': loggedUserData.schoolId})
                .lean()
                .exec(function (err, behaviouralScoreList) {
                    return next(err, klassSectionStudentList, klassSectionStudentBehaviourList, behaviouralScoreList);
                });
        },


        function (klassSectionStudentList, klassSectionStudentBehaviourList, behaviouralScoreList, next) {

            var behaviouralScoreIdMapper = {};
            _.each(behaviouralScoreList, function (behaviouralScoreData) {
                behaviouralScoreIdMapper[behaviouralScoreData._id] = behaviouralScoreData.displayName;
            });

            var klassSectionStudentIdMapper = {};
            var groupedKlassSectionStudentBehaviourList = _.groupBy(klassSectionStudentBehaviourList, "klassSectionStudentId");
            _.each(groupedKlassSectionStudentBehaviourList, function (studentBehaviourList, klassSectionStudentId) {

                var studentLearningTraitData = {
                    'scoreValue': 0,
                    'scoreInfoList': []
                };

                var scoreInfoMapper = {};
                _.each(studentBehaviourList, function (studentBehaviourData) {
                    var behaviouralScoreId = studentBehaviourData.behaviouralScoreId;
                    var behaviouralName = behaviouralScoreIdMapper[behaviouralScoreId];
                    var scoreInfoData = scoreInfoMapper[behaviouralScoreId] ||
                        {'displayName': behaviouralName, 'count': 0};
                    scoreInfoData.count++;
                    studentLearningTraitData.scoreValue += studentBehaviourData.scoreValue;
                    scoreInfoMapper[behaviouralScoreId] = scoreInfoData;
                });
                studentLearningTraitData.scoreInfoList = _.sortBy(_.values(scoreInfoMapper), "displayName");
                klassSectionStudentIdMapper[klassSectionStudentId] = studentLearningTraitData;
            });

            var klassSectionLearningTraitList = _.map(klassSectionStudentList, function (klassSectionStudentData) {
                var studentData = klassSectionStudentData.studentId;
                var studentLearningTraitData = klassSectionStudentIdMapper[klassSectionStudentData._id] || {
                        'scoreValue': 0,
                        'scoreInfoList': []
                    };
                studentLearningTraitData.studentName = studentData.name;
                studentLearningTraitData.rollNo = studentData.rollNo;
                return studentLearningTraitData;
            });
            return next(null, klassSectionLearningTraitList);
        }

    ], function done(err, klassSectionLearningTraitList) {

        if (err) {
            return handleError(res, err);
        }
        return res.status(200)
            .send({'result': klassSectionLearningTraitList});
    });
};


function handleError(res, err) {
    return res.status(500).send(err);
}