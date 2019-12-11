'use strict';
var async = require('async');
var mongoose = require('mongoose');
var Promise = require('bluebird');
// set Promise provider to bluebird
mongoose.Promise = Promise;
var _ = require('lodash');

var StudentBehaviour = require('../studentbehaviour/studentbehaviour.model');
var KlassSection = require('../klasssection/klasssection.model');
var KlassSectionStudent = require('../klasssectionstudent/klasssectionstudent.model');
var BehaviouralScore = require('../behaviouralscore/behaviouralscore.model');
var BehaviouralAttribute = require('../behaviouralattribute/behaviouralattribute.model');

exports.getPrincipalLearningTraitsInfo = function (schoolId, academicYearId) {
    return new Promise(_.partial(learningTraitsInfoPromise, schoolId, academicYearId));
};


function learningTraitsInfoPromise(schoolId, academicYearId, resolve, reject) {

    var resultObj = {
        sectionBehaviourInfoMap: {},
        klassSectionNameList: [],
        scores: [],
        attributes: [],
        topPerformanceStudents: [], //section wise
        topPerformanceHeaderNameList: [] //section wise
    };

    var processData = {
        'scores': [],
        'behaviouralScoreList': [],
        'attributes': [],
        'behaviouralAttributeList': [],
        'klassSectionList': [],
        'studentBehaviourList': []
    };

    async.waterfall([
        //get all school  sections
        function (next) {

            KlassSection.find({schoolId: schoolId})
                .populate('klassId')
                .lean()
                .exec(function (err, data) {
                    if (err) {
                        return next(err)
                    }
                    data = _.sortBy(data, function (klassSectionData) {
                        var klassData = klassSectionData.klassId;
                        klassSectionData.order = klassData.order;
                        return klassSectionData.order
                    });
                    processData.klassSectionList = data;
                    next();
                });
        },

        function (next) {

            BehaviouralScore.find({schoolId: schoolId})
                .lean()
                .sort({'scoreValue': -1})
                .exec(function (err, behaviouralScoreList) {
                    if (err) {
                        return next(err)
                    }
                    resultObj.scores = _.map(behaviouralScoreList, "displayName");
                    processData.scores = resultObj.scores;
                    processData.behaviouralScoreList = behaviouralScoreList;
                    next();
                });
        },

        function (next) {

            BehaviouralAttribute.find({schoolId: schoolId})
                .lean()
                .exec(function (err, behaviouralAttributeList) {
                    if (err) {
                        return next(err)
                    }
                    resultObj.attributes = _.map(behaviouralAttributeList, "attributeName");
                    processData.attributes = resultObj.attributes;
                    processData.behaviouralAttributeList = behaviouralAttributeList;
                    next();
                });
        },

        //get all student's all behaviours with score
        function (next) {

            StudentBehaviour.find({schoolId: schoolId, academicYearId: academicYearId})
                .lean()
                .populate("klassSectionStudentId")
                .exec(function (err, allStudentsBehaviours) {
                    if (err) {
                        return next(err);
                    }

                    var options = {
                        path: 'klassSectionStudentId.studentId',
                        model: 'Student'
                    };
                    StudentBehaviour.populate(allStudentsBehaviours, options, function (err, allStudentsBehaviours) {
                        if (err) {
                            return next(err);
                        }
                        processData.klassSectionStudentBehaviourList = allStudentsBehaviours;
                        next();
                    });
                });
        },

        function (next) {

            buildLearningTraitsResult1(processData, resultObj);
            next();
        }

    ], function done(err) {

        if (err)  return reject(err);

        return resolve(resultObj);
    });
}

function buildSectionBehaviourChart(behaviourList, behaviouralScoreList, behaviouralAttributeList) {
    var sectionResult = {
        studentBehaviourList: [],
        attributeList: [],
        scoreList: [],
        scoreCharData: {}
    };

    var behaviouralScoreIdMapper = createModelIdMapper(behaviouralScoreList);
    var behaviouralAttributeIdMapper = createModelIdMapper(behaviouralAttributeList);

    var validBehaviourList = _.filter(behaviourList, function (behaviourData) {
        return behaviourData.behaviouralAttributeId && behaviourData.behaviouralScoreId;
    });

    sectionResult.studentBehaviourList = _.sortBy(validBehaviourList, function (validBehaviourObj) {
        var behaviouralScoreData = behaviouralScoreIdMapper[validBehaviourObj.behaviouralScoreId];
        return parseInt(behaviouralScoreData.scoreValue);
    });

    var attributeNameMap = _.groupBy(sectionResult.studentBehaviourList, function (behaviourObj) {
        var behaviouralAttributeData = behaviouralAttributeIdMapper[behaviourObj.behaviouralAttributeId];
        return behaviouralAttributeData.attributeName;
    });
    var scoreValueMap = _.groupBy(sectionResult.studentBehaviourList, function (behaviourObj) {
        return behaviourObj.behaviouralScoreId.displayName;
    });


    _.forEach(attributeNameMap, function (behaviourValues, key) {
        var attrObj = {};
        attrObj[key] = behaviourValues.length;
        sectionResult.attributeList.push(attrObj);
    });

    sectionResult.scoreList = _.map(behaviouralScoreList, function (behaviourScoreObj) {
        var scoreObj = {};
        scoreObj[behaviourScoreObj.displayName] = 0;
        return scoreObj;

    });

    _.forEach(sectionResult.scoreList, function (scoreObj) {
        _.forEach(scoreObj, function (value, key) {
            scoreObj[key] = scoreValueMap[key] ? scoreValueMap[key].length : 0;
        });
    });


    var scoreChartData = [];
    _.forEach(sectionResult.scoreList, function (score) {

        var chartObj = {};

        _.forEach(score, function (value, key) {
            var scorePercentage = (score[key] / behaviourList.length) * 100;
            chartObj.x = `${scorePercentage.toFixed(0)}%`;
            chartObj.y = scorePercentage;
        });
        scoreChartData.push(chartObj);
    });
    sectionResult.scoreCharData = scoreChartData;
    return sectionResult;

}


function buildAttributeChartDetails(behaviouralScoreList, behaviouralAttributeList, studentBehaviourList) {

    var attributeChartDetails = [];
    _.each(behaviouralScoreList, function (scoreObj) {

        var scoreValueList = [];
        _.each(behaviouralAttributeList, function (attributeObj) {

            var axisObj = {
                x: attributeObj.attributeName
            };

            axisObj.y = _.filter(studentBehaviourList, function (behaviourObj) {
                return behaviourObj.behaviouralAttributeId.toString() == attributeObj._id.toString() && behaviourObj.behaviouralScoreId.toString() == scoreObj._id.toString();
            }).length;

            scoreValueList.push(axisObj);
        });
        attributeChartDetails.push(scoreValueList);
    });
    return attributeChartDetails;
}

/**
 * find top performing student in   behaviour
 * @param sectionBehaviours
 * @returns {{}}
 */
function findTopPerformingStudent(sectionBehaviours) {

    var groupBehavioursByStudent = _.groupBy(sectionBehaviours, function (studentBehaviour) {
        return studentBehaviour.klassSectionStudentId._id;
    });

    var topPerformingStudent = null;
    _.each(groupBehavioursByStudent, function (studentBehaviours) {
        var klassSectionStudent = studentBehaviours[0].klassSectionStudentId;
        var student = klassSectionStudent.studentId;
        var totalScores = _.reduce(studentBehaviours, function (result, studentBehaviour) {
            return result + (+studentBehaviour.behaviouralScoreId.scoreValue || 0);
        }, 0);
        var avgScore = totalScores / studentBehaviours.length;

        if (topPerformingStudent == null) {
            topPerformingStudent = {};
            topPerformingStudent.avgScore = avgScore;
            topPerformingStudent.studentName = student.name;
        }

        if (avgScore > topPerformingStudent.avgScore) {
            topPerformingStudent.avgScore = avgScore;
            topPerformingStudent.studentName = student.name;
        }

        topPerformingStudent.avgScore = Math.round(topPerformingStudent.avgScore);
    });
    return topPerformingStudent;
}

function buildLearningTraitsResult(processData, resultObj) {

    var allStudentsBehaviours = processData.klassSectionStudentBehaviourList,
        klassSectionList = processData.klassSectionList,
        behaviouralScoreList = processData.behaviouralScoreList,
        behaviouralAttributeList = processData.behaviouralAttributeList;

    var sectionMap = {};
    _.each(klassSectionList, function (klassSectionData) {
        sectionMap[klassSectionData._id.toString()] = klassSectionData;
    });

    var groupBehavioursBySection = _.groupBy(allStudentsBehaviours, "klassSectionId");
    _.each(groupBehavioursBySection, function (sectionBehaviours, sectionId) {
        var sectionInfo = sectionMap[sectionId];
        var sectionBehaviourInfo = buildSectionBehaviourChart(sectionBehaviours, behaviouralScoreList, behaviouralAttributeList);
        var attributeChartDetails = buildAttributeChartDetails(behaviouralScoreList,
            behaviouralAttributeList, sectionBehaviourInfo.studentBehaviourList);
        sectionBehaviourInfo.attributeChartDetails = attributeChartDetails;
        resultObj.sectionBehaviourInfoMap[sectionId] = sectionBehaviourInfo;
        var topPerformingStudent = findTopPerformingStudent(sectionBehaviours);
        var topPerformingSectionStudent = {
            klassSectionName: sectionInfo.klassSectionName,
            studentName: (topPerformingStudent && topPerformingStudent.studentName) || "-",
            avgScore: (topPerformingStudent && topPerformingStudent.avgScore) || 0
        };
        resultObj.topPerformanceStudents.push(topPerformingSectionStudent);
    });
}

///////////////////// START of NEW-CODE /////////////

//, "behaviouralScoreId", "behaviouralAttributeId" , "klassSectionStudentId.studentId"
function buildLearningTraitsResult1(processData, resultObj) {

    var klassSectionList = processData.klassSectionList,
        behaviouralScoreList = processData.behaviouralScoreList,
        behaviouralAttributeList = processData.behaviouralAttributeList,
        allKlassSectionStudentBehaviourList = processData.klassSectionStudentBehaviourList,
        behaviouralScoreNames = (!processData.scores || processData.scores.length==0) ? ['EMPTY1','EMPTY2','EMPTY3'] : processData.scores,
        attributes = processData.attributes;

    var klassSectionListIdMapper = createModelIdMapper(klassSectionList);
    var behaviouralScoreIdMapper = createModelIdMapper(behaviouralScoreList);
    var behaviouralAttributeIdMapper = createModelIdMapper(behaviouralAttributeList);

    //Default Top Performing Behaviour Data
    var defaultBehaviourTableData = {
        'klassSectionName': '-',
        'studentName': '-',
        'totalScore': 0
    };
    _.each(behaviouralScoreNames, function (scoreName) {
        defaultBehaviourTableData[scoreName] = 0;
    });


    var klassSectionGroupedStudentBehaviourList = _.groupBy(allKlassSectionStudentBehaviourList, "klassSectionId");
    _.each(klassSectionList, function(klassSectionData){

        var klassSectionId = klassSectionData._id;
        var klassSectionStudentBehaviourList = klassSectionGroupedStudentBehaviourList[klassSectionId] || [];
        var groupBehavioursByStudent = _.groupBy(klassSectionStudentBehaviourList, function (studentBehaviour) {
            var klassSectionStudentData = studentBehaviour.klassSectionStudentId; //populated field
            return klassSectionStudentData._id;
        });

        var defaultKlassSectionBehaviourInfo = _.cloneDeep(defaultBehaviourTableData, true);
        defaultKlassSectionBehaviourInfo.klassSectionName = klassSectionData.klassSectionName;

        var studentBehaviourInfoList = [];
        _.each(groupBehavioursByStudent, function (studentBehaviourList, klassSectionStudentId) {
            var klassSectionStudent = studentBehaviourList[0].klassSectionStudentId;
            var studentData = klassSectionStudent.studentId;
            var studentBehaviourInfo = _.cloneDeep(defaultKlassSectionBehaviourInfo, true);
            studentBehaviourInfo.studentName = studentData.name;
            _.each(studentBehaviourList, function (studentBehaviourData) {
                var behaviouralScoreData = behaviouralScoreIdMapper[studentBehaviourData.behaviouralScoreId];
                if(behaviouralScoreData){
                    studentBehaviourInfo[behaviouralScoreData.displayName]++;

                    var behaviouralScoreValue = behaviouralScoreData.scoreValue || 0;
                    studentBehaviourInfo.totalScore += behaviouralScoreValue;
                }
            });
            studentBehaviourInfoList.push(studentBehaviourInfo);
        });
        var orderedStudentBehaviourInfoList = _.sortBy(studentBehaviourInfoList, 'totalScore').reverse();
        var topPerformingSectionStudentData = (orderedStudentBehaviourInfoList.length!=0) ? orderedStudentBehaviourInfoList[0] : defaultKlassSectionBehaviourInfo;
        resultObj.topPerformanceStudents.push(topPerformingSectionStudentData);


        var sectionBehaviourInfo = constructKlassSectionChartData(klassSectionStudentBehaviourList, behaviouralScoreList, behaviouralAttributeList);
        resultObj.sectionBehaviourInfoMap[klassSectionData.klassSectionName] = sectionBehaviourInfo;
    });

    //Order topPerformance studeny by its score
    var orderedTopPerformingStudentList = _.sortBy(resultObj.topPerformanceStudents, 'totalScore');
    resultObj.topPerformanceStudents = orderedTopPerformingStudentList.reverse();


    var topPerformanceHeaderNameList = ["Students", "Section"];
    _.each(behaviouralScoreNames, function (scoreName) {
        topPerformanceHeaderNameList.push(scoreName);
    });
    resultObj.topPerformanceHeaderNameList = topPerformanceHeaderNameList;



    //Construct 'None-Selected' Chart Data
    var noneSectionBehaviourInfo = {
        attributeList: [],
        scoreList: [],
        scoreCharData: [],
        attributeChartDetails:[]
    };
    _.each(resultObj.sectionBehaviourInfoMap, function(sectionBehaviourInfo, klassSectionName){
        appendAttributeValues(sectionBehaviourInfo.attributeList, noneSectionBehaviourInfo.attributeList);
        appendAttributeValues(sectionBehaviourInfo.scoreList, noneSectionBehaviourInfo.scoreList);

        appendBehaviourScoreChartValues(sectionBehaviourInfo.scoreCharData, noneSectionBehaviourInfo.scoreCharData);
        appendBehaviourAttributeChartValues(sectionBehaviourInfo.attributeChartDetails, noneSectionBehaviourInfo.attributeChartDetails);
    });

    resultObj.klassSectionNameList = _.keys(resultObj.sectionBehaviourInfoMap);
    resultObj.klassSectionNameList.unshift('None selected'); //This is to make sure 'None selected' is on the top list

    calculateAllKlassSectionBehaviourScoreChartAverageValues(noneSectionBehaviourInfo.scoreCharData);
    resultObj.sectionBehaviourInfoMap['None selected'] = noneSectionBehaviourInfo;
}


function calculateAllKlassSectionBehaviourScoreChartAverageValues(destinationScoreCharDataList){
    _.each(destinationScoreCharDataList, function(destinationScoreCharData, index){
        var scorePercentage = (destinationScoreCharData.y / destinationScoreCharDataList.length);
        destinationScoreCharData.x = " ";
        destinationScoreCharData.y = scorePercentage;
    });
}



function appendBehaviourScoreChartValues(sourceScoreCharDataList, destinationScoreCharDataList){
    if(destinationScoreCharDataList.length==0){
        _.each(sourceScoreCharDataList, function(sourceScoreCharData){
            destinationScoreCharDataList.push({x:'0%', y:0});
        });
    }

    _.each(sourceScoreCharDataList, function(sourceScoreCharData, index){
        var destinationScoreCharData = destinationScoreCharDataList[index];

        var xSourceStrVal = sourceScoreCharData.x.replace("%",'');
        var xSourceVal = +xSourceStrVal;

        var xDestinationStrVal = destinationScoreCharData.x.replace("%",'');
        var xDestinationVal = +xDestinationStrVal;
        xDestinationVal += xSourceVal;

        destinationScoreCharData.x = xDestinationVal+"%";
        destinationScoreCharData.y += sourceScoreCharData.y;
    });
}


function appendBehaviourAttributeChartValues(sourceAttributeChartDetailList, destinationAttributeChartDetailList){
    if(destinationAttributeChartDetailList.length==0){
        _.each(sourceAttributeChartDetailList, function(sourceAttributeChartDetail){
            destinationAttributeChartDetailList.push([]);
        });
    }

    _.each(sourceAttributeChartDetailList, function(sourceDataList, index){

        var destinationDataList = destinationAttributeChartDetailList[index];
        _.each(sourceDataList, function(sourceData){

            var destinationData = _.find(destinationDataList, function(data){
                return data.x==sourceData.x;
            });
            if(!destinationData){
                destinationDataList.push({'x':sourceData.x, 'y':sourceData.y});
            }else{
                destinationData.y += sourceData.y;
            }
        });
    });
}


function appendAttributeValues(sourceDataList, destinationDataList){

    _.each(sourceDataList, function(sourceData){

        var propertyName = _.keys(sourceData)[0];
        var destinationData = _.find(destinationDataList, function(data){
            var propertyValue = data[propertyName];
            return (propertyValue!=null) ? true : false;
        });
        if(!destinationData){
            destinationData = {};
            destinationData[propertyName] = 0;
            destinationDataList.push(destinationData);
        }

        var sourcePropertyValue = sourceData[propertyName];
        var destinationPropertyValue = destinationData[propertyName];
        destinationData[propertyName] = destinationPropertyValue + sourcePropertyValue;
    });
}

function constructKlassSectionChartData(klassSectionStudentBehaviourList, behaviouralScoreList, behaviouralAttributeList){

    var sectionResult = {
        attributeList: [],
        scoreList: [],
        scoreCharData: [],
        attributeChartDetails:[]
    };

    var behaviouralScoreIdMapper = createModelIdMapper(behaviouralScoreList);
    var behaviouralAttributeIdMapper = createModelIdMapper(behaviouralAttributeList);


    var studentBehaviourAttributeNameMapper = _.groupBy(klassSectionStudentBehaviourList, function (studentBehaviourData) {
        var behaviouralAttributeData = behaviouralAttributeIdMapper[studentBehaviourData.behaviouralAttributeId] || {};
        return behaviouralAttributeData.attributeName;
    });
    var studentBehaviourScoreNameMapper = _.groupBy(klassSectionStudentBehaviourList, function (studentBehaviourData) {
        var behaviouralScoreData = behaviouralScoreIdMapper[studentBehaviourData.behaviouralScoreId] || {};
        return behaviouralScoreData.displayName;
    });


    sectionResult.attributeList = _.map(behaviouralAttributeList, function (behaviourAttributeObj) {
        var mappedStudentBehaviourAttributeList = studentBehaviourAttributeNameMapper[behaviourAttributeObj.attributeName] || [];
        var attrObj = {};
        attrObj[behaviourAttributeObj.attributeName] = mappedStudentBehaviourAttributeList.length;
        return attrObj;
    });
    sectionResult.scoreList = _.map(behaviouralScoreList, function (behaviourScoreObj) {
        var mappedStudentBehaviourScoreList = studentBehaviourScoreNameMapper[behaviourScoreObj.displayName] || [];
        var scoreObj = {};
        scoreObj[behaviourScoreObj.displayName] = mappedStudentBehaviourScoreList.length;
        return scoreObj;
    });

    sectionResult.scoreCharData = buildSectionBehaviourChart1(klassSectionStudentBehaviourList, sectionResult.scoreList);
    sectionResult.attributeChartDetails = buildAttributeChartDetails1(klassSectionStudentBehaviourList, behaviouralScoreList, behaviouralAttributeList);
    return sectionResult;
}


function buildSectionBehaviourChart1(klassSectionStudentBehaviourList, scoreList) {

    var scoreCharData = _.map(scoreList, function (scoreObj) {
        if(klassSectionStudentBehaviourList.length==0){
            return {
                x:'0%',
                y:0
            };
        }
        var chartObj = {};
        _.forEach(scoreObj, function (value, displayName) {
            var scorePercentage = (scoreObj[displayName] / klassSectionStudentBehaviourList.length) * 100;
            chartObj.x = " ";
            chartObj.y = scorePercentage;
        });
        return chartObj;
    });

    return scoreCharData;
}


function buildAttributeChartDetails1(klassSectionStudentBehaviourList, behaviouralScoreList, behaviouralAttributeList) {

    var behaviouralAttributeIdScoreIdMapper = {};
    _.each(klassSectionStudentBehaviourList, function(klassSectionStudentBehaviourData){
        var uniqKey = klassSectionStudentBehaviourData.behaviouralAttributeId+"_"+klassSectionStudentBehaviourData.behaviouralScoreId;
        var klassSectionStudentBehaviourDataList = behaviouralAttributeIdScoreIdMapper[uniqKey] || [];
        klassSectionStudentBehaviourDataList.push(klassSectionStudentBehaviourData);
        behaviouralAttributeIdScoreIdMapper[uniqKey] = klassSectionStudentBehaviourDataList;
    });

    var attributeChartDetails = [];
    _.each(behaviouralScoreList, function (scoreObj) {
        var scoreValueList = [];
        _.each(behaviouralAttributeList, function (attributeObj) {
            var uniqKey = attributeObj._id+"_"+scoreObj._id;
            var klassSectionStudentBehaviourDataList = behaviouralAttributeIdScoreIdMapper[uniqKey] || [];
            var axisObj = {
                x: attributeObj.attributeName,
                y: klassSectionStudentBehaviourDataList.length
            };
            scoreValueList.push(axisObj);
        });
        attributeChartDetails.push(scoreValueList);
    });
    return attributeChartDetails;
}


function createModelIdMapper(modelDataList) {
    var modelIdMapper = {};
    _.each(modelDataList, function (modelData) {
        modelIdMapper[modelData._id.toString()] = modelData;
    });
    return modelIdMapper;
}

///////////////////// END of NEW-CODE /////////////

