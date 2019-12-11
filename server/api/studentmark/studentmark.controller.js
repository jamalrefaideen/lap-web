'use strict';


var async = require("async");
var _ = require("lodash");
var mongoose = require('mongoose');
var Promise = require('bluebird');
// set Promise provider to bluebird
mongoose.Promise = Promise;


var Exam = require('../exam/exam.model');
var StudentMark = require('./studentmark.model');
var StudentResult = require('../studentresult/studentresult.model');
var KlassSectionStudent = require('../klasssectionstudent/klasssectionstudent.model');
var Student = require('../student/student.model');
var KlassSectionSubject = require('../klasssectionsubject/klasssectionsubject.model');
var auditmanager = require('../../config/auditmanager');


/////////////// START of New Result SCreen Code ///////////

//input: {'examTypeId', 'klassSectionId'}
//output:[ {
//          'name',
//          'rollNo',
//          'admissionNo',
//          'profilePictureUrl',
//          'studentId',
//          'klassSectionStudentId',
//          'examTypeId',
//          'klassSectionId',
//          'totalMarksObtained'
//          'studentMarkInfoList':[{'subjectName', 'marks', 'totalMarks', 'examId', 'klassSectionSubjectId'}, {...}, ...]
//      }]
exports.getStudentMarksByKlassSection = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;
    var schoolId = loggedUserData.schoolId;

    var examTypeId = mongoose.Types.ObjectId(req.params.examTypeId);
    var klassSectionId = mongoose.Types.ObjectId(req.params.klassSectionId);

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
                'academicYearId': academicYearData._id,
                'examTypeId': examTypeId,
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
                    return next(err, studentList, examList, klassSectionSubjectList, studentMarkList);
                });
        },

        function (studentList, examList, klassSectionSubjectList, studentMarkList, next) {
            
            var klassSectionSubjectIdToExamDataMapper = {};
            _.each(examList, function (examData) {
                klassSectionSubjectIdToExamDataMapper[examData.klassSectionSubjectId] = examData;
            });

            var studentMarkGroupedByStudentId = _.groupBy(studentMarkList, 'studentId');
            var klassSectionStudentResultList = _.map(studentList, function (studentData) {

                var studentExamMarkList = studentMarkGroupedByStudentId[studentData._id] || [];
                var klassSectionSubjectIdToStudentMarkMapper = {};
                _.each(studentExamMarkList, function (studentMarkData) {
                    klassSectionSubjectIdToStudentMarkMapper[studentMarkData.klassSectionSubjectId] = studentMarkData;
                });

                var studentMarkInfoList = _.map(klassSectionSubjectList, function (klassSectionSubjectData) {
                    var klassSectionSubjectId = klassSectionSubjectData._id;
                    var studentMarkData = klassSectionSubjectIdToStudentMarkMapper[klassSectionSubjectId] || {'marks': 0};
                    var examData = klassSectionSubjectIdToExamDataMapper[klassSectionSubjectId] || {'totalMarks': 0};
                    return {
                        'subjectName': klassSectionSubjectData.subjectName,
                        'klassSectionSubjectId': klassSectionSubjectData._id,
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
            next(null, klassSectionStudentResultList);
        }

    ], function done(err, klassSectionStudentResultList) {

        if (err) {
            return handleError(res, err)
        }

        return res.status(200).send({'result': klassSectionStudentResultList});
    });
};


//input:[ {
//          'name',
//          'rollNo',
//          'admissionNo',
//          'profilePictureUrl',
//          'studentId',
//          'klassSectionStudentId',
//          'examTypeId',
//          'klassSectionId',
//          'totalMarksObtained'
//          'studentMarkInfoList':[{'subjectName', 'marks', 'totalMarks', 'examId', 'klassSectionSubjectId'}, {...}, ...]
//      }]
exports.storeKlassSectionStudentMarks = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;
    var schoolId = loggedUserData.schoolId;

    var examTypeId = mongoose.Types.ObjectId(req.params.examTypeId);
    var klassSectionId = mongoose.Types.ObjectId(req.params.klassSectionId);
    var klassSectionStudentMarkList = req.body;

    async.waterfall([

        function (next) {

            var query = {
                'schoolId': schoolId,
                'academicYearId': academicYearData._id,
                'examTypeId': examTypeId,
                'klassSectionId': klassSectionId
            };
            Exam.find(query)
                .lean()
                .exec(next);
        },

        function (examList, next) {

            var examIdList = _.map(examList, "_id");
            var query = {
                'schoolId': schoolId,
                'academicYearId': academicYearData._id,
                'examId': {$in: examIdList}
            };
            StudentMark.remove(query, function (err) {
                return next(err, examList);
            });
        },


        function (examList, next) {

            var studentMarkDataList = [];
            _.each(klassSectionStudentMarkList, function (studentMarkResultData) {
                _.each(studentMarkResultData.studentMarkInfoList, function (studentMarkInfoData) {
                    var markData = +studentMarkInfoData.marks;
                    var studentMarkModelData = {
                        'examId': mongoose.Types.ObjectId(studentMarkInfoData.examId),
                        'klassSectionSubjectId': mongoose.Types.ObjectId(studentMarkInfoData.klassSectionSubjectId),
                        'studentId': mongoose.Types.ObjectId(studentMarkResultData.studentId),
                        'marks': isNaN(markData) ? 0 : +markData
                    };
                    auditmanager.populateCreationAcademicAccountAudit(loggedUserData, studentMarkModelData);
                    studentMarkDataList.push(studentMarkModelData);
                });
            });

            StudentMark.create(studentMarkDataList, function (err, savedStudentMarkList) {
                return next(err, examList);
            });
        },

        function (examList, next) {

            var studentResultInputData = {
                'schoolId': schoolId,
                'academicYearId': academicYearData._id,
                'examTypeId': examTypeId,
                'klassSectionId': klassSectionId,
                'examList': examList,
                'loggedUserData': loggedUserData
            };
            updateKlassSectionStudentResult(studentResultInputData, next);
        }

    ], function done(err) {

        if (err) {
            return handleError(res, err)
        }

        return res.status(200).send({'message': "Successfully saved mark data"});
    });
};


//input:{
//          'name',
//          'rollNo',
//          'admissionNo',
//          'profilePictureUrl',
//          'studentId',
//          'klassSectionStudentId',
//          'examTypeId',
//          'klassSectionId',
//          'totalMarksObtained'
//          'studentMarkInfoList':[{'subjectName', 'marks', 'totalMarks', 'examId', 'klassSectionSubjectId'}, {...}, ...]
//      }
exports.storeStudentMarks = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;
    var schoolId = loggedUserData.schoolId;

    var inputData = req.body;
    var examTypeId = mongoose.Types.ObjectId(inputData.examTypeId);
    var klassSectionId = mongoose.Types.ObjectId(inputData.klassSectionId);

    async.waterfall([

        function (next) {

            var query = {
                'schoolId': schoolId,
                'academicYearId': academicYearData._id,
                'examTypeId': examTypeId,
                'klassSectionId': klassSectionId
            };
            Exam.find(query)
                .lean()
                .exec(next);
        },

        function (examList, next) {

            var examIdList = _.map(examList, "_id");
            var query = {
                'schoolId': schoolId,
                'academicYearId': academicYearData._id,
                'examId': {$in: examIdList},
                'studentId': mongoose.Types.ObjectId(inputData.studentId)
            };
            StudentMark.remove(query, function (err) {
                return next(err, examList);
            });
        },


        function (examList, next) {

            var studentMarkDataList = _.map(inputData.studentMarkInfoList, function (studentMarkInfoData) {
                var markData = +studentMarkInfoData.marks;
                var studentMarkModelData = {
                    'examId': mongoose.Types.ObjectId(studentMarkInfoData.examId),
                    'klassSectionSubjectId': mongoose.Types.ObjectId(studentMarkInfoData.klassSectionSubjectId),
                    'studentId': mongoose.Types.ObjectId(inputData.studentId),
                    'marks': isNaN(markData) ? 0 : +markData
                };
                auditmanager.populateCreationAcademicAccountAudit(loggedUserData, studentMarkModelData);
                return studentMarkModelData;
            });

            StudentMark.create(studentMarkDataList, function (err) {
                return next(err, examList);
            });
        },

        function (examList, next) {

            var studentResultInputData = {
                'schoolId': schoolId,
                'academicYearId': academicYearData._id,
                'examTypeId': examTypeId,
                'klassSectionId': klassSectionId,
                'examList': examList,
                'loggedUserData': loggedUserData
            };
            updateKlassSectionStudentResult(studentResultInputData, next);
        }

    ], function done(err) {

        if (err) {
            return handleError(res, err)
        }

        return res.status(200).send({'message': "Successfully saved mark data"});
    });
};


function updateKlassSectionStudentResult(inputData, callback) {

    var schoolId = inputData.schoolId,
        academicYearId = inputData.academicYearId,
        examTypeId = inputData.examTypeId,
        klassSectionId = inputData.klassSectionId,
        loggedUserData = inputData.loggedUserData,
        examList = inputData.examList;

    async.waterfall([

        function (next) {

            var query = {
                'schoolId': schoolId,
                'academicYearId': academicYearId,
                'examTypeId': examTypeId,
                'klassSectionId': klassSectionId
            };
            StudentResult.remove(query, function (err) {
                return next(err);
            });
        },

        function (next) {

            var examIdList = _.map(examList, "_id");
            var query = {
                'schoolId': schoolId,
                'academicYearId': academicYearId,
                'examId': {$in: examIdList}
            };
            StudentMark.find(query)
                .lean()
                .exec(function (err, klassSectionStudentMarkList) {
                    return next(err, klassSectionStudentMarkList);
                });
        },


        function (klassSectionStudentMarkList, next) {

            var examIdMapper = {};
            _.each(examList, function (examData) {
                examIdMapper[examData._id] = examData;
            });


            var studentResultModelDataList = [];
            var studentMarkListGroupedByStudentId = _.groupBy(klassSectionStudentMarkList, "studentId");
            _.each(studentMarkListGroupedByStudentId, function (studentMarkList, studentId) {
                var totalMarks = 0, marksObtained = 0;
                _.each(studentMarkList, function (studentMarkData) {
                    var examData = examIdMapper[studentMarkData.examId];
                    totalMarks += examData.totalMarks;
                    marksObtained += studentMarkData.marks;
                });
                var studentResultModelData = {
                    'examTypeId': examTypeId,
                    'studentId': mongoose.Types.ObjectId(studentId),
                    'klassSectionId': klassSectionId,
                    'totalMarks': totalMarks,
                    'marksObtained': marksObtained
                };
                auditmanager.populateCreationAcademicAccountAudit(loggedUserData, studentResultModelData);
                studentResultModelDataList.push(studentResultModelData);
            });
            return next(null, studentResultModelDataList);
        },

        function (studentResultModelDataList, next) {

            var orderedStudentResultModelDataList = _.sortBy(studentResultModelDataList, "marksObtained");
            _.each(orderedStudentResultModelDataList, function (studentResultModelData, index) {
                studentResultModelData.rank = orderedStudentResultModelDataList.length - index;
            });
            StudentResult.create(orderedStudentResultModelDataList, next);
        }

    ], function done(err) {

        return callback(err);
    });
}


/////////////// END of New Result SCreen Code ///////////


exports.storeBulkStudentMarksByKlassSection = function (req, res) {

    var loggedUserData = req.loggedUserData;
    var academicYearData = loggedUserData.academicYearData;
    var schoolId = loggedUserData.schoolId;

    var examTypeId = mongoose.Types.ObjectId(req.params.examTypeId);
    var klassSectionId = mongoose.Types.ObjectId(req.params.klassSectionId);

    async.waterfall([

        function (next) {

            var query = {
                'schoolId': schoolId,
                'academicYearId': academicYearData._id,
                'examTypeId': examTypeId,
                'klassSectionId': klassSectionId
            };
            Exam.find(query)
                .lean()
                .exec(next);
        },

        function (examList, next) {

            var examIdList = _.map(examList, "_id");
            var query = {
                'schoolId': schoolId,
                'academicYearId': academicYearData._id,
                'examId': {$in: examIdList}
            };
            StudentMark.remove(query, function (err) {
                return next(err, examList);
            });
        },

        function (examList, next) {

            var query = {
                'schoolId': schoolId,
                'academicYearId': academicYearData._id,
                'examTypeId': examTypeId,
                'klassSectionId': klassSectionId
            };
            StudentResult.remove(query, function (err) {
                return next(err, examList);
            });
        },


        function (examList, next) {

            var studentMarkDataList = req.body || [];
            if (studentMarkDataList.length == 0) { // as empty batch exectution throws an error.. so skip it
                return next();
            }

            var inputData = {
                'examTypeId': examTypeId,
                'klassSectionId': klassSectionId,
                'loggedUserData': loggedUserData,
                'academicYearData': academicYearData,
                'studentMarkDataList': studentMarkDataList,
                'examList': examList
            };
            createStudentMarkAndResultDataList(inputData, next);
        }

    ], function done(err) {

        if (err) {
            return handleError(res, err)
        }

        return res.status(200).send({'message': "Successfully saved mark data"});
    });
};


function createStudentMarkAndResultDataList(inputData, callback) {

    var examTypeId = inputData.examTypeId;
    var klassSectionId = inputData.klassSectionId;
    var loggedUserData = inputData.loggedUserData;
    var academicYearData = inputData.academicYearData;
    var studentMarkDataList = inputData.studentMarkDataList;
    var examList = inputData.examList;

    async.waterfall([

        function (next) {

            var batch = StudentMark.collection.initializeUnorderedBulkOp();
            _.each(studentMarkDataList, function (studentMarkData) {
                var studentMarkModelData = pluckStudentMarkFields(studentMarkData);
                studentMarkModelData.examId = mongoose.Types.ObjectId(studentMarkModelData.examId);
                studentMarkModelData.klassSectionSubjectId = mongoose.Types.ObjectId(studentMarkModelData.klassSectionSubjectId);
                studentMarkModelData.studentId = mongoose.Types.ObjectId(studentMarkModelData.studentId);
                auditmanager.populateCreationAcademicAccountAudit(loggedUserData, studentMarkModelData);
                batch.insert(studentMarkModelData);
            });
            batch.execute(function (err) {
                return next(err);
            });
        },

        function (next) {

            var examIdList = _.map(examList, "_id");
            var query = {
                'schoolId': loggedUserData.schoolId,
                'academicYearId': academicYearData._id,
                'examId': {$in: examIdList}
            };
            StudentMark.find(query)
                .lean()
                .exec(next);
        },

        function (savedStudentMarkList, next) {

            var examIdMapper = {};
            _.each(examList, function (examData) {
                examIdMapper[examData._id] = examData;
            });


            var studentResultModelDataList = [];
            var studentMarkListGroupedByStudentId = _.groupBy(savedStudentMarkList, "studentId");
            _.each(studentMarkListGroupedByStudentId, function (studentMarkList, studentId) {
                var totalMarks = 0, marksObtained = 0;
                _.each(studentMarkList, function (studentMarkData) {
                    var examData = examIdMapper[studentMarkData.examId];
                    totalMarks += examData.totalMarks;
                    marksObtained += studentMarkData.marks;
                });
                var studentResultModelData = {
                    'examTypeId': examTypeId,
                    'studentId': mongoose.Types.ObjectId(studentId),
                    'klassSectionId': klassSectionId,
                    'totalMarks': totalMarks,
                    'marksObtained': marksObtained
                };
                auditmanager.populateCreationAcademicAccountAudit(loggedUserData, studentResultModelData);
                studentResultModelDataList.push(studentResultModelData);
            });
            return next(null, studentResultModelDataList);
        },

        function (studentResultModelDataList, next) {

            var orderedStudentResultModelDataList = _.sortBy(studentResultModelDataList, "marksObtained");
            _.each(orderedStudentResultModelDataList, function (studentResultModelData, index) {
                studentResultModelData.rank = orderedStudentResultModelDataList.length - index;
            });
            StudentResult.create(orderedStudentResultModelDataList, next);
        }

    ], function (err) {

        return callback(err);
    });
}


function pluckStudentMarkFields(data) {

    var modelFields = ["examId", "klassSectionSubjectId", "studentId", "resultType", "resultGradeId"];
    var modelData = {};
    _.each(modelFields, function (fieldName) {
        if (data[fieldName] != undefined) {
            modelData[fieldName] = data[fieldName];
        }
    });

    if (!data.marks || data.marks == undefined || data.marks == null) {
        modelData["marks"] = 0;
    } else {
        modelData["marks"] = +data.marks;
    }
    return modelData;
}

function handleError(res, err) {
    return res.status(500).send(err);
}
