'use strict';
var _ = require("lodash");
var async = require('async');
var mongoose = require('mongoose');
var BehaviouralScore = require('./behaviouralscore.model');
var auditManager = require('../../config/auditmanager');

exports.getBehaviourScores = function (req, res) {
    var loggedUserData = req.loggedUserData;
    var query = {
        schoolId: loggedUserData.schoolId
    };
    BehaviouralScore.find(query)
        .lean()
        .sort({'scoreValue':-1})
        .exec(function (err, BehaviourScoreList) {

            if (err) {
                return handleError(res, err);
            }
            return res.status(200).send(BehaviourScoreList);
        });

};


exports.saveBehaviourScore = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var behaviourScoreList = req.body;

    var batch = BehaviouralScore.collection.initializeUnorderedBulkOp();
    _.each(behaviourScoreList, function (behaviourObj) {
        if(behaviourObj._id){
            var findQuery = {_id: mongoose.Types.ObjectId(behaviourObj._id)};
            var behaviourDBData = _.pick(behaviourObj, ["displayName", "scoreValue"]);
            auditManager.populateUpdateAudit(loggedUserData, behaviourDBData);
            batch.find(findQuery)
                .updateOne({$set: behaviourDBData});
        }else{
            var behaviourDBData = _.pick(behaviourObj, ["displayName", "scoreValue"]);
            auditManager.populateCreationAccountAudit(loggedUserData, behaviourDBData);
            batch.insert(behaviourDBData);
        }
    });
    batch.execute(function(err){

        if (err) {
            return handleError(res, err);
        }
        return res.status(200).send("Success");
    });
};



function handleError(res, err) {
    return res.status(500).send(err);
}