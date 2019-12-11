/**
 * Created by Mathdisk on 8/18/2017.
 */
var async = require("async");
var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
mongoose.Promise = Promise;
var ExamModel = require('./exam.model');


/**
 * remove  klass section exams by type
 * @param examTypeId
 * @param klassSectionId
 */
function removeKlassSectionExams(examTypeId, klassSectionId) {
    var query = {examTypeId: examTypeId, klassSectionId: klassSectionId};
    return ExamModel.remove(query);
}

function createExams(examList) {
    return ExamModel.create(examList);
}

function findExamsByKlassSectionAndExamType(klassSectionId, examTypeId) {
    var query = {klassSectionId: klassSectionId, examTypeId: examTypeId};
    var subjectPopulateQuery = {
        path: 'klassSectionSubjectId',
        model: "KlassSectionSubject",
        populate: {
            path: 'subjectTypeId',
            model: 'SubjectType'
        }
    };
    return ExamModel.find(query)
        .lean()
        .populate(["schoolCalendarId", "examTypeId", "klassSectionSubjectId"])
        .then(function (docs) {
            return ExamModel.populate(docs, {
                path: 'klassSectionSubjectId.subjectTypeId',
                model: 'SubjectType'
            })
        })
        .then(buildExamListResult)

}


function buildExamListResult(examList) {
    var examListResult = _.map(examList, function (exam) {
        var klassSectionSubjectData = exam.klassSectionSubjectId; //populatedItem
        var result = _.pick(exam, ["_id", "duration", "startTime", "endTime","totalMarks"]);
        result.examDate = exam.schoolCalendarId.date;
        result.examType = exam.examTypeId.name;
        result.subjectName = klassSectionSubjectData.subjectTypeId.subjectName;
        result.klassSectionSubjectId = klassSectionSubjectData._id;
        return result;
    });
    return _.sortBy(examListResult, "examDate");
}


exports.removeKlassSectionExams = removeKlassSectionExams;
exports.createExams = createExams;
exports.findExamList = findExamsByKlassSectionAndExamType;
