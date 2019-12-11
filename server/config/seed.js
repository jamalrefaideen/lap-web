/**
 * Populate DB with sample data on server start
 * to disable, edit config/environment/index.js, and set `seedDB: false`
 */

'use strict';

var _ = require("lodash");
var Promise = require('bluebird');
var async = require('async');

var User = require('../api/user/user.model');

var masterSeedGenrator = require("./seeddata/master_seeddata");
var testDataGenerator = require("./seeddata/testdatagenerator/testDataGenerator");


require('./seeddata/mainmenu.data');
//require('./seeddata/sample.accountuser.data');

setupRootAdminAccount()
    .then(function () {
        console.log('All seed data generated done now...');
    }).catch(function (err) {
        console.log('Got an error while creating seed data');
    });



//this methid will create rootAdmin only if database dont have any rrotAdmin account....
function setupRootAdminAccount(){

    return new Promise(function(resolve, reject){

        User.find({isLapAdmin:true})
            .lean()
            .count(function (err, rootAdminCount) {

                if(err) return reject(err);

                if(rootAdminCount==0) {
                    createRootAdminAccount(function(err){
                        if(err) return reject(err);
                        resolve();
                    });
                }else{
                    resolve();
                }
            });
    });
}


function createRootAdminAccount(callback){

    var RootAdminObj = {
        provider: 'local',
        name: 'Lap Solutions',
        email: 'admin@lap.com',
        mobileNumber: 1122334455,
        password: 'lap123',
        isLapAdmin: true,
        activated:true
    };

    User.create(RootAdminObj, function(err,data){

        if(err) console.error("Error occurred while creating Lap admin sample seed data");
        else console.log("Successfully created Lap admin sample seed data");

        callback(err);
    });
}


