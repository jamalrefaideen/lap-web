'use strict';

var async = require("async");
var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
// set Promise provider to bluebird
mongoose.Promise = Promise;
var auditManager = require('../../config/auditmanager');

var Klass = require('./klass.model');
var KlassSection = require('../klasssection/klasssection.model');
var KlassHolidayService = require('../klassholiday/klassholiday.service');

exports.createKlassBySchool = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var inputListData = req.body;

    async.waterfall([

        function (next) {

            Klass.find({schoolId: loggedUserData.schoolId})
                .lean()
                .count()
                .exec(next)
        },

        function (klassCount, next) {

            var classOrder = klassCount;
            _.each(inputListData, function (inputObj) {
                auditManager.populateCreationAccountAudit(loggedUserData, inputObj);
            });

            Klass.create(inputListData, next);
        },


        function (allKlassList, next) {
            KlassHolidayService.createDefaultHolidaysToKlasses(loggedUserData.academicYearData, allKlassList)
                .then(function () {
                    next(null, allKlassList);
                })
                .catch(next);
        }

    ], function (err, data) {

        if (err) {
            return handleError(res, err)
        }

        res.send(200, "Success");
    });
};

exports.updateKlassObj = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var inputData = req.body;
    var klassObjId = inputData._id;
    delete inputData._id;

    async.waterfall([

        function (next) {
            auditManager.populateUpdateAudit(loggedUserData, inputData);
            Klass.update({_id: klassObjId}, {$set: inputData}, function (err, data) {
                if (err) {
                    return next(err)
                }

                next()
            });
        },

        function (next) {
            KlassSection.find({klassId:klassObjId})
                .lean()
                .exec(function(err,klassSections){
                    if (err) {
                        return next(err)
                    }

                    next(err,klassSections)
                })
        },

        function (klassSections,next) {

            if (klassSections.length == 0)return next();

            // Batch update for klass sections
            var batch = KlassSection.collection.initializeUnorderedBulkOp();

            _.forEach(klassSections, function (data) {

                var dataId = data._id;
                var objectId = mongoose.Types.ObjectId(dataId);

                data = _.omit(data, '_id');
                data.klassSectionName = inputData.klassName +' - '+ data.sectionName;

                auditManager.populateUpdateAudit(loggedUserData, data);
                batch.find({_id: objectId}).updateOne({$set: data});
            });

            batch.execute(function (err, result) {
                next();
            });
        }


    ],function(err,data){

        if (err) {
            return handleError(res,err)
        }
        res.send(200,"Success")
    });


};

exports.updateKlassOrder = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var inputKlassListData = req.body;

    var batch = Klass.collection.initializeUnorderedBulkOp();

    _.forEach(inputKlassListData, function (data) {

        var dataId = data._id;
        var objectId = mongoose.Types.ObjectId(dataId);

        data = _.omit(data, '_id');

        auditManager.populateUpdateAudit(loggedUserData, data);
        batch.find({_id: objectId}).updateOne({$set: data});
    });

    batch.execute(function (err, result) {

        if (err) {
            return handleError(res,err)
        }

        res.send(200,"Success")
    });

};

exports.getKlassDetailsById = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var klassId = req.params.klassId;

    async.waterfall([

        function (next) {

            Klass.findById(klassId)
                .lean()
                .exec(function (err, klassDetails) {

                    return next(err, klassDetails)
                });
        },

        function (klassDetails, next) {

            KlassSection.find({klassId: klassDetails._id})
                .lean()
                .populate('staffId')
                .exec(function (err, docs) {

                    if (err) {
                        return next(err)
                    }

                    var options = {
                        path: 'staffId.userId',
                        model: 'User'
                    };
                    KlassSection.populate(docs, options, function (err, klassSections) {

                        if (err) {
                            return next(err);
                        }

                        _.each(klassSections, function (klassSectionData) {
                            var staffData = klassSectionData.staffId;
                            var staffUserData = staffData.userId.toObject();
                            klassSectionData.staffName = staffUserData.name;
                            klassSectionData.staffMobileNumber = staffUserData.mobileNumber;
                            klassSectionData.staffEmail = staffUserData.email;
                        });
                        klassDetails.klassSectionList = klassSections;
                        next(err, klassDetails);
                    });
                });
        }
    ], function (err, data) {

        if (err) {
            return handleError(res, err)
        }

        return res.send(200, data);

    })

};


exports.getKlassList = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;

    async.waterfall([

        function (next) {

            var query = {
                'schoolId': schoolId
            };
            Klass.find(query)
                .lean()
                .exec(function (err, klassList) {
                    return next(err, klassList);
                });
        },

        function (klassList, next) {

            var query = {
                'schoolId': schoolId
            };
            KlassSection.find(query)
                .lean()
                .populate("staffId")
                .exec(function (err, doc) {

                    if (err) {
                        return handleError(res, err)
                    }

                    var options = {
                        path: 'staffId.userId',
                        model: 'User'
                    };
                    KlassSection.populate(doc, options, function (err, klassSectionList) {

                        if (err) {
                            return handleError(res, err)
                        }
                        return next(err, klassList, klassSectionList)
                    });
                });
        },

        function (klassList, allKlassSectionList, next) {

            var groupedKlassSectionList = _.groupBy(allKlassSectionList, "klassId");
            _.each(klassList, function (klassData) {
                var klassSectionList = groupedKlassSectionList[klassData._id] || [];
                klassData.klassSectionList = _.sortBy(klassSectionList, "sectionName");
            });
            next(null, klassList);
        }


    ], function done(err, klassList) {

        if (err) {
            return handleError(res, err)
        }

        var orderedKlassList = _.sortBy(klassList, "order");
        return res.status(200).send(orderedKlassList);
    });
};


function handleError(res, err) {
    return res.status(500).send(err);
}

