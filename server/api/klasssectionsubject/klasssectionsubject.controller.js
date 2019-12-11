'use strict';

var async = require("async");
var _ = require("lodash");
var mongoose = require('mongoose');
var Promise = require('bluebird');
// set Promise provider to bluebird
mongoose.Promise = Promise;


var Staff = require('../staff/staff.model');
var User = require('../user/user.model');
var SubjectType = require('../subjecttype/subjecttype.model');
var KlassSectionSubject = require('./klasssectionsubject.model');
var KlassSection = require('../klasssection/klasssection.model');
var auditManager = require('../../config/auditmanager');

exports.saveklassSectionSubject = function(req,res){

    var loggedUserData = req.loggedUserData;
    var klassSectionId = req.params.klassSectionId;
    var klassSectionSubjectList = req.body || [];
    if(klassSectionSubjectList.length==0){
        return res.status(200).send("Success");
    }

    var batch = KlassSectionSubject.collection.initializeUnorderedBulkOp();
    _.each(klassSectionSubjectList, function (klassSectionSubject) {
        if(klassSectionSubject._id){
            var findQuery = {_id: mongoose.Types.ObjectId(klassSectionSubject._id)};
            var klassSectionSubjectDBData = {
                'subjectTypeId':mongoose.Types.ObjectId(klassSectionSubject.subjectTypeId),
                'staffId':mongoose.Types.ObjectId(klassSectionSubject.staffId)
            };
            auditManager.populateUpdateAudit(loggedUserData, klassSectionSubjectDBData);
            batch.find(findQuery)
                .updateOne({$set: klassSectionSubjectDBData});
        }else{
            var klassSectionSubjectDBData = {
                'klassSectionId':mongoose.Types.ObjectId(klassSectionId),
                'subjectTypeId':mongoose.Types.ObjectId(klassSectionSubject.subjectTypeId),
                'staffId':mongoose.Types.ObjectId(klassSectionSubject.staffId)
            };
            auditManager.populateCreationAcademicAccountAudit(loggedUserData, klassSectionSubjectDBData);
            batch.insert(klassSectionSubjectDBData);
        }
    });
    batch.execute(function(err){

        if (err) {
            return handleError(res, err);
        }
        return res.status(200).send("Success");
    });
};

exports.getKlassSectionSubjectById = function(req, res){

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var klassSectionSubjectId = req.params.klassSectionSubjectId;
    var query = {
        'schoolId': schoolId,
        '_id' : klassSectionSubjectId
    };
    KlassSectionSubject.findOne(query)
        .lean()
        .populate(["staffId", "subjectTypeId"])
        .exec(function(err, klassSectionSubjectObj){

            if(err){
                return handleError(res, err)
            }

            var options = {
                path: 'staffId.userId',
                model: 'User'
            };

            KlassSectionSubject.populate(klassSectionSubjectObj, options, function (err, populatedKlassSectionSubject) {

                if (err) {
                    return handleError(res, err)
                }

                return res.status(200).send(populatedKlassSectionSubject);

            });

        });
};

exports.updateKlassSectionSubject =  function(req,res){

    var loggedUserData = req.loggedUserData;
    var klassSectionSubjectId = req.params.klassSectionSubjectId;
    var updateData = req.body;

    var query = {"_id":mongoose.Types.ObjectId(klassSectionSubjectId)};

    auditManager.populateUpdateAudit(loggedUserData, updateData);

    KlassSectionSubject.update(query,{$set:updateData}, function(err,data){

        if(err){
            return handleError(res,err);
        }
        res.send(200,"Success");
    });
};

exports.getKlassSectionSubjectList = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var schoolId = loggedUserData.schoolId;
    var academicYearData = loggedUserData.academicYearData;
    var academicYearId = academicYearData._id;

    async.waterfall([

        function(next){

            var query = {
                'schoolId': schoolId,
                'academicYearId':academicYearId,
                'klassSectionId': mongoose.Types.ObjectId(req.params.klassSectionId)
            };

            KlassSectionSubject.find(query)
                .lean()
                .populate(["staffId", "subjectTypeId"])
                .exec(function(err, docs) {

                    if (err) {
                        return next(err)
                    }

                    var options = {
                        path: 'staffId.userId',
                        model: 'User'
                    };
                    KlassSectionSubject.populate(docs, options, function (err, klassSectionSubjectList) {

                        if (err) {
                            return next(err)
                        }

                        _.each(klassSectionSubjectList, function(klassSectionSubject){
                            var schoolSubjectData =  klassSectionSubject.subjectTypeId;
                            klassSectionSubject.subjectName = schoolSubjectData.subjectName;
                            klassSectionSubject.subjectDescription = schoolSubjectData.description;

                            var staffData = klassSectionSubject.staffId;
                            var staffUserData = staffData.userId.toObject();
                            klassSectionSubject.staffName = staffUserData.name;
                            klassSectionSubject.staffMobileNumber = staffUserData.mobileNumber;
                            klassSectionSubject.staffEmail = staffUserData.email;
                        });
                        return next(null, klassSectionSubjectList);
                    });
                });
        },

        function(klassSectionSubjectList, next){

            var query = {
                'schoolId': schoolId,
                '_id': mongoose.Types.ObjectId(req.params.klassSectionId)
            };

            KlassSection.findOne(query)
                .populate("staffId")
                .lean()
                .exec(function(err, docs){

                    if(err) return next(err);

                    var options = {
                        path: 'staffId.userId',
                        model: 'User'
                    };
                    KlassSection.populate(docs, options, function (err, ownKlassSection) {

                        if(err) return next(err);

                        var staffData = ownKlassSection.staffId;
                        var staffUserData = staffData.userId;
                        ownKlassSection.staffName = staffUserData.name;
                        return next(null, klassSectionSubjectList, ownKlassSection);
                    });
                });
        }

    ], function done(err, klassSectionSubjectList, ownKlassSection){

        if (err) {
            return handleError(res, err);
        }

        var resultData = {
            'klassSectionSubjectList':klassSectionSubjectList,
            'klassSectionData':ownKlassSection
        };
        return res.json(resultData);
    });
};


function handleError(res, err) {
    return res.status(500).send( err);
}
