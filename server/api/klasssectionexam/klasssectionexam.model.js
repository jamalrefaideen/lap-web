'use strict';

var async = require("async");
var _ = require("lodash");
var moment = require("moment");

var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var KlassSectionExamSchema = new Schema({
    examTypeId:{type:Schema.Types.ObjectId,ref:'ExamType'},
    klassSectionId:{type:Schema.Types.ObjectId,ref:'KlassSection'},
    examStartDate:{type:Schema.Types.ObjectId,ref:'SchoolCalendar'},
    examEndDate:{type:Schema.Types.ObjectId,ref:'SchoolCalendar'},

    academicYearId:{type:Schema.Types.ObjectId,ref:'AcademicYear'},
    schoolId:{type:Schema.Types.ObjectId,ref:'School'},
    createdOn:{ type: Date, default: Date.now },
    modifiedOn:Date,
    createdBy:{ type: Schema.Types.ObjectId, ref: 'User'},
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User'}
});


//inputData:{currentDate, loggedUserData}
KlassSectionExamSchema.statics.findRecentlyCompletedByDate = function (inputData, callback) {

    var currentDate = new Date(inputData.currentDate);
    var loggedUserData = inputData.loggedUserData;

    async.waterfall([

        function(next){

            var academicYearData = loggedUserData.academicYearData;
            var query = {
                'schoolId':loggedUserData.schoolId,
                'academicYearId':academicYearData._id
            };
            var ExamType = mongoose.model('ExamType');
            ExamType.find(query)
                .lean()
                .exec(function(err, examTypeList){
                    return next(err, examTypeList);
                });
        },

        function(examTypeList, next){

            var academicYearData = loggedUserData.academicYearData;
            var query = {
                'schoolId':loggedUserData.schoolId,
                'academicYearId':academicYearData._id
            };
            var KlassSectionExam = mongoose.model('KlassSectionExam');
            KlassSectionExam.find(query)
                .populate("examEndDate")
                .lean()
                .exec(function(err, klassSectionExamList){
                    return next(err, examTypeList, klassSectionExamList);
                });
        },

        function(examTypeList, klassSectionExamList, next){

            var examTypeId2ExamDataMapper = {};
            _.each(examTypeList, function(examTypeData){
                examTypeId2ExamDataMapper[examTypeData._id] = examTypeData;
            });

            var klassSectionToExamTypeMapper = {};
            var groupedKlassSectionExamListByKlassSectionId = _.groupBy(klassSectionExamList, "klassSectionId");
            _.each(groupedKlassSectionExamListByKlassSectionId, function(groupedKlassSectionExamList, klassSectionId){

                var completedKlassSectionExamList = _.filter(groupedKlassSectionExamList, function(klassSectionExam){
                    var examEndDate = klassSectionExam.examEndDate;
                    var calenderEndDate = new Date(examEndDate.date);
                    return calenderEndDate.getTime()<currentDate.getTime();
                });

                var orderedKlassSectionExamList = _.sortBy(completedKlassSectionExamList, function(klassSectionExam){
                    var examEndDate = klassSectionExam.examEndDate;
                    var calenderEndDate = new Date(examEndDate.date);
                    return calenderEndDate;
                });

                var recentKlassSectionExamData = orderedKlassSectionExamList[orderedKlassSectionExamList.length-1];
                if(recentKlassSectionExamData){
                    var examTypeData = examTypeId2ExamDataMapper[recentKlassSectionExamData.examTypeId];
                    klassSectionToExamTypeMapper[klassSectionId] = examTypeData;
                }
            });
            return next(null, klassSectionToExamTypeMapper);
        }

    ], function done(err, klassSectionToExamTypeMapper){

        return callback(err, klassSectionToExamTypeMapper);
    });
};


module.exports = mongoose.model('KlassSectionExam', KlassSectionExamSchema);
