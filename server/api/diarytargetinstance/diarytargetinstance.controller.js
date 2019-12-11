'use strict';

var DiaryTargetInstance = require('./diarytargetinstance.model');
var mongoose = require('mongoose');
var Promise = require('bluebird');
// set Promise provider to bluebird
mongoose.Promise = Promise;

exports.getDiaryInstancesByStudent = function (req,res) {

    var studentId = req.params.studentId;

    DiaryTargetInstance.find({studentId:studentId})
        .populate('diaryId')
        .then(function (diaryInstanceList) {

            return res.status(200).send( diaryInstanceList);

        }).catch(function (err) {

        return handleError(res, err)
    });

};

function handleError(res,err) {
    return res.status(500).send(err);
}
