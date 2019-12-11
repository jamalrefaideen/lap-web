/**
 * Created by Mathdisk on 8/18/2017.
 */
var _ = require("lodash");

exports.handleSuccess = function(res){
    return _.partial(onSuccessResponse, res);
};
exports.handleError = function(res){
    return _.partial(onFailureResponse, res)
};



function onSuccessResponse(res, result){
    res.status(200).send(result);
}

function onFailureResponse(res, result){
    res.status(500).send(result);
}