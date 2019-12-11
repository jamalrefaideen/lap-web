/**
 * Created by HP on Jun-08-15.
 */

var _ = require('lodash');
var async = require('async');
var fs = require('fs');
var path = require('path');
var csv = require('csv');

var Promise = require('bluebird');
// set Promise provider to bluebird
require('mongoose').Promise = require('bluebird');
var mongoose = require('mongoose');

var config = require("./../../../config/environment");

var School = require("../../../api/school/school.model");
var AcademicYear = require("../../../api/academicyear/academicyear.model");
var Klass = require("../../../api/klass/klass.model");
var KlassSection = require("../../../api/klasssection/klasssection.model");
var SubjectType = require("../../../api/subjecttype/subjecttype.model");
var KlassSectionSubject = require("../../../api/klasssectionsubject/klasssectionsubject.model");
var KlassSectionStudent = require("../../../api/klasssectionstudent/klasssectionstudent.model");
var KlassPeriod = require("./../../../api/klassperiod/klassperiod.model");
var Timetable = require("./../../../api/timetable/timetable.model");
var StudentAttendance = require("./../../../api/studentattendance/studentattendance.model");
var LateArrival = require("./../../../api/latearrival/latearrival.model");
var ExamType = require("./../../../api/examtype/examtype.model");
var Exam = require("./../../../api/exam/exam.model");
var StudentMark = require("./../../../api/studentmark/studentmark.model");
var StudentResult = require("./../../../api/studentresult/studentresult.model");
var BehaviouralScore = require("./../../../api/behaviouralscore/behaviouralscore.model");
var BehaviouralAttribute = require("./../../../api/behaviouralattribute/behaviouralattribute.model");
var StudentBehaviour = require("./../../../api/studentbehaviour/studentbehaviour.model");
var Diary = require("./../../../api/diary/diary.model");
var DiaryTargetInstance = require("./../../../api/diarytargetinstance/diarytargetinstance.model");
var Event = require("./../../../api/event/event.model");
var ResultGrade = require("./../../../api/resultgrade/resultgrade.model");


var User = require("../../../api/user/user.model");
var Staff = require("../../../api/staff/staff.model");
var Student = require("../../../api/student/student.model");
var Parent = require("../../../api/parent/parent.model");
var SchoolUserRole = require("../../../api/schooluserrole/schooluserrole.model");

var CONSTANTS = require("../../../api/dataconstants/constants");
var ModelDataTypes = CONSTANTS.ModelDataTypes;
var CSVModelDataTypeMapper = require("./csv_model_datatypes").ModelDataTypes;
var auditmanager = require("./../../auditmanager");

var staffTestDataGenerator = require("./../../../api/staff/csv_staff_generator");
var studentTestDataGenerator = require("./../../../api/student/csv_student_generator.js");

exports.generateTestData = generateTestData;

function generateTestData() {

    return new Promise(function(resolve, reject){
        resetAllMappers()
            .then(processCsvFileIntoJsonFile)
            .then(function () {
                console.log('test seed data generated now...');
                resolve('test seed data generated now...');
            }).catch(function (err) {
                console.log('Got an error while creating test seed data');
                reject(new Error('Got an error while creating test seed data'));
            });
    });
}


function resetAllMappers() {

    return Promise.all([
        School.remove(),
        AcademicYear.remove(),
        Klass.remove(),
        KlassSection.remove(),
        SubjectType.remove(),
        KlassSectionSubject.remove(),
        KlassSectionStudent.remove(),
        KlassPeriod.remove(),
        Timetable.remove(),
        StudentAttendance.remove(),
        LateArrival.remove(),
        ExamType.remove(),
        Exam.remove(),
        StudentMark.remove(),
        StudentResult.remove(),
        BehaviouralScore.remove(),
        BehaviouralAttribute.remove(),
        StudentBehaviour.remove(),
        Diary.remove(),
        DiaryTargetInstance.remove(),
        Event.remove(),
        ResultGrade.remove(),

        User.remove({'isLapAdmin':false}),
        Staff.remove(),
        Student.remove(),
        
        Parent.remove(),
        SchoolUserRole.remove()
    ]);
}

function processCsvFileIntoJsonFile() {

    var filesDirectoryName = getFilesDirectoryName();
    var csvFileNames = getDirectories();

    return Promise.each(csvFileNames, function iterator(fileName) {
        var csvFilePath = path.resolve(filesDirectoryName, fileName);
        return readAndProcessCsvFileIntoJsonFile(csvFilePath, fileName);
    });
}


function getFilesDirectoryName() {
    var fullFilePath = path.resolve(config.root, "server", "csvtestfiles");
    return fullFilePath;
}


function getDirectories() {
    return [
        "school.csv",
        "academicyear.csv",
        "staff.csv",
        "student.csv",
        "klass.csv",
        "klass_section.csv",
        "subject_type.csv",
        "klass_section_subject.csv",
        "klass_section_student.csv",
        "klassperiod1.csv",
        "timetable1.csv",
        "student_attendence.csv",
        "late_arrival.csv",
        "exam_type.csv",
        "resultgrade.csv",
        "exam.csv",
        "student_mark.csv",
        "student_result.csv",
        "behavioural_score.csv",
        "behaviour_attribute.csv",
        "studentbehaviour.csv",
        "diary.csv",
        "diarytargetinstance.csv",
        "event.csv"
    ];
}


function readAndProcessCsvFileIntoJsonFile(csvFilePath, fileName) {

    var fileData = fs.readFileSync(csvFilePath);

    return new Promise(function (resolve, reject) {
        csv.parse(fileData, function (err, parsedData) {
            if (err) {
                return reject(err);
            }
            genrateJsonFromCsv(parsedData, fileName)
                .then(resolve)
                .catch(reject);
        });
    });
}

function genrateJsonFromCsv(parsedData, fileName) {
    var csvModelDataTypeObject = CSVModelDataTypeMapper[fileName];

    var generatorFunctionMapper = {
        'staff.csv':staffTestDataGenerator.generate,
        'student.csv':studentTestDataGenerator.generate
    };
    console.log("Generating testData for the file: "+fileName);
    var generatorFunction = generatorFunctionMapper[fileName] || testDataGenerator;
    return generatorFunction(parsedData, csvModelDataTypeObject);
}



function testDataGenerator(parsedData, csvModelDataTypeObject){

    var rowLength = parsedData.length;
    var modelAttributes = parsedData[0];
    var modelDataList = [];

    var attributeTypeMapper = csvModelDataTypeObject.attributeTypeMapper;
    var mongooseModel = csvModelDataTypeObject.mongooseModel;
    for (var rowIndex = 1; rowIndex < rowLength; rowIndex++) {
        var csvRowData = parsedData[rowIndex];
        var modelData = createModelData(modelAttributes, csvRowData, attributeTypeMapper);
        modelDataList.push(modelData);
    }

    return new Promise(function (resolve, reject) {
        mongooseModel.create(modelDataList, function(err, data){
            if(err) return reject(err);
            return resolve(data);
        })
    });
}


function createModelData(modelAttributes, values, attributeTypeMapper) {

    var modelData = {};
    _.each(modelAttributes, function (modelAttribute, index) {
        var modelValue = values[index];
        var modelDataType = attributeTypeMapper[modelAttribute];
        modelData[modelAttribute] = getTypedModelData(modelDataType, modelValue);
    });
    return modelData;
}


function getTypedModelData(modelDataType, modelValue) {

    if (modelDataType == ModelDataTypes.OBJECT_ID) {
        return mongoose.Types.ObjectId(modelValue);
    } else if (modelDataType == ModelDataTypes.DATE) {
        return new Date(modelValue);
    } else {
        return modelValue;
    }
}
