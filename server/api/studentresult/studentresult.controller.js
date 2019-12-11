'use strict';
var async = require('async');
var mongoose = require('mongoose');
var Promise = require('bluebird');
var _ = require('lodash');
// set Promise provider to bluebird
mongoose.Promise = Promise;


var StudentResult = require('./studentresult.model');
var Student = require('../student/student.model');
var KlassSectionSubject = require('../klasssectionsubject/klasssectionsubject.model');
var StudentMark = require('../studentmark/studentmark.model');
var ExamType = require('./../examtype/examtype.model');
var SubjectType = require('./../subjecttype/subjecttype.model');
var Exam = require('./../exam/exam.model');
var KlassSectionStudent = require("../klasssectionstudent/klasssectionstudent.model");


exports.getExamResultsWithDetailsByStudent = function (req, res) {

    var studentId = req.params.studentId;
    var klassSectionId = req.params.klassSectionId;
    var schoolId = req.loggedUserData.schoolId;
    var academicYearData = req.loggedUserData.academicYearData;

    var processingObj = {
        examTypeIds: [],
        klassSectionSubjectIds: [],
        subjectTypeIds: [],
        subjectTypeList: [],
        marksData: []
    };


    var resultObj = {
        examTypeList: [],
        examSubjects: [],
        studentResultMarks: [],
        chartDetails: []
    };

    async.waterfall([

            function (next) {

                var query = {
                    'academicYearId': academicYearData._id,
                    'schoolId': schoolId,
                    'klassSectionId': klassSectionId
                };
                Exam.find(query)
                    .populate(['klassSectionSubjectId', 'examTypeId'])
                    .lean()
                    .exec(function (err, examList) {

                        if (err) {
                            return next(err);
                        }

                        var subjectTypeIds = [], examTypeIds = [],
                            klassSectionSubjectIds = [], klassSectionExamTypeList = [];
                        _.each(examList, function (examObj) {

                            var klassSectionSubjectData = examObj.klassSectionSubjectId;
                            klassSectionSubjectIds.push(klassSectionSubjectData._id);
                            subjectTypeIds.push(klassSectionSubjectData.subjectTypeId);

                            var examTypeData = examObj.examTypeId;
                            examTypeIds.push(examTypeData._id);
                            klassSectionExamTypeList.push(examTypeData);
                        });

                        processingObj.examList = examList;
                        processingObj.klassSectionSubjectIds = _.uniq(klassSectionSubjectIds, function (klassSectionSubjectId) {
                            return klassSectionSubjectId.toString();
                        });

                        processingObj.subjectTypeIds = _.uniq(subjectTypeIds, function (subjectTypeId) {
                            return subjectTypeId.toString();
                        });

                        processingObj.examTypeIds = _.uniq(examTypeIds, function (examTypeId) {
                            return examTypeId.toString();
                        });

                        processingObj.examTypeList = _.uniq(klassSectionExamTypeList, function (examTypeData) {
                            return examTypeData.name;
                        });
                        next(err);
                    });

            },
            function (next) {

                SubjectType.find({_id: {$in: processingObj.subjectTypeIds}})
                    .lean()
                    .exec(function (err, subjectTypes) {

                        if (err) {
                            return next(err);
                        }

                        processingObj.subjectTypeList = subjectTypes;
                        next();
                    });
            },

            function (next) {

                var query = {
                    'academicYearId': academicYearData._id,
                    'schoolId': schoolId,
                    'studentId': studentId
                };
                StudentMark.find(query)
                    .lean()
                    .populate(['examId', 'klassSectionSubjectId'])
                    .exec(function (err, studentMarks) {

                        if (err) {
                            return next(err);
                        }

                        processingObj.marksData = studentMarks;
                        next();
                    });
            },

            function (next) {

                var subjectTypeIdMapper = {};
                _.each(processingObj.subjectTypeList, function (subjectTypeData) {
                    subjectTypeIdMapper[subjectTypeData._id] = subjectTypeData.subjectName;
                });

                var studentMarks = processingObj.marksData;
                var studentMarksGroupedByExamTypeId = {};
                _.each(studentMarks, function (studentMarkData) {
                    var examData = studentMarkData.examId;
                    if(!examData){//This is for the case, where exam is created multi-times for the section.. Now solved this situation
                        //console.log("studentMarkData-id: "+studentMarkData._id);
                        //console.log("examId not exists in db for: "+studentMarkData.examId);
                        return;
                    }
                    var examTypeId = examData.examTypeId.toString();
                    var klassSectionSubjectData = studentMarkData.klassSectionSubjectId;
                    var subjectName = subjectTypeIdMapper[klassSectionSubjectData.subjectTypeId];

                    var examTypeMappedStudentMarkData = studentMarksGroupedByExamTypeId[examTypeId] || {};
                    examTypeMappedStudentMarkData[subjectName] = studentMarkData;
                    studentMarksGroupedByExamTypeId[examTypeId] = examTypeMappedStudentMarkData;
                });
                processingObj.studentMarksGroupedByExamTypeId = studentMarksGroupedByExamTypeId;

                next();
            },

            function (next) { // TABLE DATA CONSTRUCTION

                var studentMarksGroupedByExamTypeId = processingObj.studentMarksGroupedByExamTypeId;
                _.each(processingObj.subjectTypeList, function (examSubjectObj) {

                    var marksArray = [];
                    _.each(processingObj.examTypeList, function (examTypeData) {

                        var examTypeId = examTypeData._id;
                        var examTypeMappedStudentMarkData = studentMarksGroupedByExamTypeId[examTypeId] || {};

                        var markObj = examTypeMappedStudentMarkData[examSubjectObj.subjectName] || {'marks': '-'};
                        marksArray.push(markObj.marks);
                    });
                    resultObj.studentResultMarks.push(marksArray);
                });
                next();
            },


            function (next) { // CHART DATA CONSTRUCTION

                var studentMarksGroupedByExamTypeId = processingObj.studentMarksGroupedByExamTypeId;
                _.each(processingObj.examTypeList, function (examTypeData) {

                    var examTypeId = examTypeData._id;
                    var examTypeMappedStudentMarkData = studentMarksGroupedByExamTypeId[examTypeId] || {};

                    var examTypeChartList = [];
                    _.each(processingObj.subjectTypeList, function (examSubjectObj) {

                        var markObj = examTypeMappedStudentMarkData[examSubjectObj.subjectName] || {'marks': 0};
                        var chartObj = {
                            x: examSubjectObj.subjectName,
                            y: markObj.marks
                        };
                        examTypeChartList.push(chartObj);
                    });
                    resultObj.chartDetails.push(examTypeChartList);
                });
                next();
            }
        ],

        function done(err, data) {

            if (err) {
                return handleError(res, err)
            }

            resultObj.examSubjects = _.map(processingObj.subjectTypeList, 'subjectName');
            resultObj.examTypeList = _.map(processingObj.examTypeList, "name");
            return res.send(200, resultObj);
        }
    );
};




exports.getExamResultsWithDetailsForKlassSection = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;
    var schoolId = loggedUserData.schoolId;
    var klassSectionId = mongoose.Types.ObjectId(req.params.klassSectionId);

    var resultObj = {
        examTypeList: [],
        examSubjectsByExamType: {},
        studentResultMarksByExamType: {},
        avgMarksByExamType:{} // examTypeName: {subject, avgMark}
    };

    async.waterfall([

            function (next) {

                var query = {
                    'schoolId': schoolId,
                    'academicYearId': academicYearData._id,
                    'isDeleted': false,
                    'klassSectionId': klassSectionId
                };
                KlassSectionStudent.find(query)
                    .lean()
                    .exec(next);
            },

            function (klassSectionStudentList, next) {

                var studentIdList = _.map(klassSectionStudentList, 'studentId');
                var query = {
                    '_id': {$in: studentIdList},
                    'schoolId': schoolId,
                    'isDeleted': false
                };
                Student.find(query)
                    .lean()
                    .exec(function (err, studentList) {

                        if (err) return next(err);

                        var studentIdToKlassSectionStudentIdMapper = {};
                        _.each(klassSectionStudentList, function (klassSectionStudentData) {
                            studentIdToKlassSectionStudentIdMapper[klassSectionStudentData.studentId] = klassSectionStudentData._id;
                        });

                        _.each(studentList, function (studentData) {
                            var klassSectionStudentId = studentIdToKlassSectionStudentIdMapper[studentData._id];
                            studentData.klassSectionStudentId = klassSectionStudentId;
                        });
                        return next(null, studentList);
                    });
            },

            function (studentList, next) {

                var query = {
                    'schoolId': schoolId,
                    'academicYearId':academicYearData._id
                };
                ExamType.find(query)
                    .lean()
                    .exec(function (err, examTypeList) {

                        if (err) {
                            return next(err);
                        }

                        resultObj.examTypeList = examTypeList;
                        next(err, studentList);
                    });
            },



            function (studentList, next) {

                var query = {
                    'schoolId': schoolId,
                    'academicYearId': academicYearData._id,
                    'klassSectionId': klassSectionId
                };
                Exam.find(query)
                    .lean()
                    .exec(function (err, examList) {
                        return next(err, studentList, examList);
                    });
            },


            function (studentList, examList, next) {

                var query = {
                    'schoolId': schoolId,
                    'academicYearId': academicYearData._id,
                    'klassSectionId': klassSectionId
                };
                KlassSectionSubject.find(query)
                    .populate('subjectTypeId')
                    .lean()
                    .exec(function (err, klassSectionSubjectList) {

                        if (err) return next(err);

                        _.each(klassSectionSubjectList, function (klassSectionSubjectData) {
                            var subjectTypeData = klassSectionSubjectData.subjectTypeId;
                            klassSectionSubjectData.subjectName = subjectTypeData.subjectName;
                        });

                        return next(err, studentList, examList, klassSectionSubjectList);
                    });
            },

            function (studentList, examList, klassSectionSubjectList, next) {

                var examIdList = _.map(examList, "_id");
                var query = {
                    'schoolId': loggedUserData.schoolId,
                    'academicYearId': academicYearData._id,
                    'examId': {$in: examIdList}
                };
                StudentMark.find(query)
                    .lean()
                    .exec(function (err, studentMarkList) {

                        if (err) {
                            return next(err);
                        }
                        return next(err, studentList, examList, klassSectionSubjectList, studentMarkList);
                    });
            },


            function (studentList, examList, klassSectionSubjectList, studentMarkList, next) {

                var examTypeIdMapper = {};
                _.each(resultObj.examTypeList, function(examTypeData){
                    examTypeIdMapper[examTypeData._id] = examTypeData;
                });

                var examTypeNameToExamListMapper = {};
                _.each(examList, function(examData){
                    var examTypeData = examTypeIdMapper[examData.examTypeId];
                    examData.examName = examTypeData.name;

                    var groupedExamList = examTypeNameToExamListMapper[examData.examName] || [];
                    groupedExamList.push(examData);
                    examTypeNameToExamListMapper[examData.examName] = groupedExamList;
                });

                var klassSectionSubjectIdMapper = {};
                _.each(klassSectionSubjectList, function (klassSectionSubjectData) { //subjectName
                    klassSectionSubjectIdMapper[klassSectionSubjectData._id] = klassSectionSubjectData;
                });

                var examIdToStudentMarkListMapper = {};
                _.each(studentMarkList, function (studentMarkData) {
                    var groupedStudentMarkList = examIdToStudentMarkListMapper[studentMarkData.examId] || [];
                    groupedStudentMarkList.push(studentMarkData);
                    examIdToStudentMarkListMapper[studentMarkData.examId] = groupedStudentMarkList;
                });

                _.each(examTypeNameToExamListMapper, function(groupedExamList, examName){

                    var examTypeKlassSectionSubjects = [];
                    var examTypeStudentMarkList = [];
                    var klassSectionSubjectIdToExamDataMapper = {};

                    _.each(groupedExamList, function(examData){
                        var klassSectionSubjectData = klassSectionSubjectIdMapper[examData.klassSectionSubjectId];
                        var examSubjectData = {
                            "subjectName": klassSectionSubjectData.subjectName,
                            "klassSectionSubjectId": klassSectionSubjectData._id,
                            "examId": examData._id
                        };
                        examTypeKlassSectionSubjects.push(examSubjectData);

                        klassSectionSubjectIdToExamDataMapper[examData.klassSectionSubjectId] = examData;
                        var groupedStudentMarkList = examIdToStudentMarkListMapper[examData._id] || [];
                        if(groupedStudentMarkList.length){
                            examTypeStudentMarkList = examTypeStudentMarkList.concat(groupedStudentMarkList);
                        }

                    });

                    var defaultExamData = groupedExamList[0];
                    var examTypeId = defaultExamData.examTypeId;

                    var orderedExamTypeKlassSectionSubjects = _.sortBy(examTypeKlassSectionSubjects, "subjectName");
                    var clonedOrderedExamTypeKlassSectionSubjects = orderedExamTypeKlassSectionSubjects.slice();
                    clonedOrderedExamTypeKlassSectionSubjects.unshift({'subjectName':'None Selected'});
                    resultObj.examSubjectsByExamType[examName] = clonedOrderedExamTypeKlassSectionSubjects;
                    resultObj.studentResultMarksByExamType[examName] = temp(studentList, examTypeStudentMarkList, orderedExamTypeKlassSectionSubjects,
                        klassSectionSubjectIdToExamDataMapper, examTypeId, klassSectionId);
                    resultObj.avgMarksByExamType[examName] = temp2(orderedExamTypeKlassSectionSubjects, resultObj.studentResultMarksByExamType[examName]);
                });
                next(null, resultObj);
                //////////// END /////////
            }
        ],

        function done(err, data) {

            if (err) {
                return handleError(res, err)
            }

            return res.status(200).send(data);
        }
    )
};




function temp(studentList, studentMarkList, examTypeKlassSectionSubjects,
              klassSectionSubjectIdToExamDataMapper, examTypeId, klassSectionId){

    var studentMarkGroupedByStudentId = _.groupBy(studentMarkList, 'studentId');
    var klassSectionStudentResultList = _.map(studentList, function (studentData) {

        var studentExamMarkList = studentMarkGroupedByStudentId[studentData._id] || [];
        var klassSectionSubjectIdToStudentMarkMapper = {};
        _.each(studentExamMarkList, function (studentMarkData) {
            klassSectionSubjectIdToStudentMarkMapper[studentMarkData.klassSectionSubjectId] = studentMarkData;
        });

        var studentMarkInfoList = _.map(examTypeKlassSectionSubjects, function (examTypeSubjectData) {
            var klassSectionSubjectId = examTypeSubjectData.klassSectionSubjectId;
            var studentMarkData = klassSectionSubjectIdToStudentMarkMapper[klassSectionSubjectId] || {'marks': 0};
            var examData = klassSectionSubjectIdToExamDataMapper[klassSectionSubjectId] || {'totalMarks': 0};
            return {
                'subjectName': examTypeSubjectData.subjectName,
                'klassSectionSubjectId': klassSectionSubjectId,
                'examId': examTypeSubjectData.examId,
                'marks': studentMarkData.marks,
                'totalMarks': examData.totalMarks
            };
        });

        var totalMarksObtained = 0;
        _.each(studentMarkInfoList, function(studentMarkInfo) {
            totalMarksObtained += (+studentMarkInfo.marks);
        });
        return {
            'name': studentData.name,
            'rollNo': studentData.rollNo,
            'admissionNo': studentData.admissionNo,
            'profilePictureUrl': studentData.profilePictureUrl,
            'studentId': studentData._id,
            'klassSectionStudentId': studentData.klassSectionStudentId,
            'examTypeId': examTypeId,
            'klassSectionId': klassSectionId,
            'totalMarksObtained': totalMarksObtained,
            'studentMarkInfoList': studentMarkInfoList
        };
    });
    return _.sortBy(klassSectionStudentResultList, "name");
}

//{subject, avgMark}
function temp2(examTypeKlassSectionSubjects, klassSectionStudentResultList){

    var klassSectionStudentChartResultList = _.map(examTypeKlassSectionSubjects, function(examTypeSubjectData){ //subjectName

        var totalSubjectMarks = 0;
        _.each(klassSectionStudentResultList, function(klassSectionStudentResultData){
            var studentMarkSubjectInfo = _.find(klassSectionStudentResultData.studentMarkInfoList, {'subjectName':examTypeSubjectData.subjectName}) || {'marks':0};
            totalSubjectMarks += studentMarkSubjectInfo.marks;
        });

        var examTypeSubjectChartData = {
            'subject':examTypeSubjectData.subjectName,
            'avgMark':Math.round(totalSubjectMarks/klassSectionStudentResultList.length)
        };
        return examTypeSubjectChartData;
    });
    return klassSectionStudentChartResultList;
}



//input: {'examTypeId', 'klassSectionId'}
exports.getStudentResultByKlassSection = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;
    var schoolId = loggedUserData.schoolId;

    var examTypeId = mongoose.Types.ObjectId(req.params.examTypeId);
    var klassSectionId = mongoose.Types.ObjectId(req.params.klassSectionId);

    var query = {
      'examTypeId':examTypeId,
      'klassSectionId':klassSectionId,
      'schoolId':schoolId,
      'academicYearId':academicYearData._id
    };
    StudentResult.find(query)
        .lean()
        .exec(function(err, studentResultList){

            if (err) {
                return handleError(res, err)
            }

            return res.send(200, studentResultList);
        })
};


function toRoundDecimal(inputValue, roundOfCount){
    var roundedVal = +inputValue.toFixed(roundOfCount);
    return isNaN(roundedVal) ? 0 : roundedVal;
}

function handleError(res, err) {
    return res.status(500).send(err);
}