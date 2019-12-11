'use strict';

var MainMenuConfig = require("../mainmenuconfig/mainmenuconfig.model");
var _ = require('lodash');


var CONSTANTS = require("../dataconstants/constants");
var UserRoleTypes = CONSTANTS.UserRoleTypes;
var Staff = require('../staff/staff.model');
var KlassSection = require('../klasssection/klasssection.model');
var MenuService = require("./menu.service");

exports.getMainMenus = function (req, res) {
    var loggedUserData = req.loggedUserData;
    MenuService.collectMenu()
        .then(function (menusByRole) {
            var loggedUserRoleName = getLoggedUserRoleName(loggedUserData);
            var mainMenus = menusByRole[loggedUserRoleName] || [];
            var uniqueMainMenus = _.uniq(mainMenus, function (data) {
                return data.viewUrl + "_" + data.displayName;
            });
            filterSubjectTeacherMenus(uniqueMainMenus, loggedUserData)
                .then(function (menus) {
                    return res.status(200).send(menus);
                })
                .catch(function (err) {
                    return handleError(res, err);
                })
        })
        .catch(function (err) {
            handleError(res, err);
        })


};


function getLoggedUserRoleName(loggedUserData) {
    if (loggedUserData.isLapAdmin) {
        var lapAdminRoleName = UserRoleTypes.LAP_ADMIN.name;
        return lapAdminRoleName;
    }
    var UserRoleTypeObjectList = _.values(UserRoleTypes);
    var loggedUserRoleObject = _.find(UserRoleTypeObjectList, {'roleId': loggedUserData.roleId});
    return loggedUserRoleObject.name;
}


function filterSubjectTeacherMenus(menus, loggedUserInfo) {
    return new Promise(function (resolve, reject) {
        var roleId = loggedUserInfo.roleId;
        if (roleId != UserRoleTypes.STAFF.roleId) {
            return resolve(menus);
        }
        findKlassSection(loggedUserInfo.userId)
            .then(function (klassSection) {
                if ((klassSection && klassSection._id) == loggedUserInfo.klassSectionId) { //check own class
                    return resolve(menus)
                }
                var subjectTeacherMenus = filterMenusForSubjectTeacher(menus);
                resolve(subjectTeacherMenus);
            })
            .catch(function (err) {
                reject(err)
            })
    })

}

function findKlassSection(userId) {
    return Staff.findOne({userId: userId}).lean()
        .then(function (staff) {
            return KlassSection.findOne({staffId: staff._id}).lean()
        })
}

function filterMenusForSubjectTeacher(menus) {
    let removableMenus = ["teacherAttendance"];
    return _.filter(menus, function (menu) {
        return !_.contains(removableMenus, menu.refState);
    })
}
function handleError(res, err) {
    return res.status(500).send(err);
}


