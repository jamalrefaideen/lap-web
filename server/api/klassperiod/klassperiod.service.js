/**
 * Created by Mathdisk on 8/17/2017.
 */

var async = require("async");
var _ = require("lodash");
var mongoose = require("mongoose");
var Promise = require('bluebird');
mongoose.Promise = Promise;
var KlassPeriodModel = mongoose.model("KlassPeriod");

/**
 * it returns promise
 */
exports.createPeriodsByKlass = function (klassPeriodInfo, klassPeriodListMap) {
    var klassIds = _.keys(klassPeriodListMap);
    var klassPeriodList = _.values(klassPeriodListMap);
    klassPeriodList = _.flatten(klassPeriodList);
    var createClassPeriodsFunction = _.partial(createKlassPeriods,klassPeriodList);
    return removeMultipleKlassPeriods(klassIds, klassPeriodInfo.academicYearId)
        .then(createClassPeriodsFunction);
};

function removeMultipleKlassPeriods(klassIds,academicYearId){
    return KlassPeriodModel.remove({klassId:{$in:klassIds},academicYearId:academicYearId})

}

function createKlassPeriods(klassPeriods) {
    return new Promise(function(resolve, reject){
        KlassPeriodModel.create(klassPeriods, function (err, docs) {
            if (err) return reject(err);
            resolve(docs);
        });
    });


}