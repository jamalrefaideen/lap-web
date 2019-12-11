'use strict';
var _ = require("lodash");

module.exports.UserRoleTypes = {
    LAP_ADMIN: {
        roleId: 2000,
        code: 'lapAdmin',
        name: 'lapadmin',
        launchUrl: 'lapAdminHome',
        feature: 'lapAdminHome'
    },
    SCHOOL_ADMIN: {
        roleId: 1800,
        code: 'schoolAdmin',
        name: 'schooladmin',
        launchUrl: 'schoolAdminHome',
        feature: 'schoolAdminHome'
    },
    PRINCIPAL: {
        roleId: 1600,
        code: 'principal',
        name: 'principal',
        launchUrl: 'principalHome',
        feature: 'principalHome'
    },
    STAFF: {
        roleId: 1400,
        code: 'staff',
        name: 'staff',
        launchUrl: 'staffHome',
        feature: 'staffHome'
    },
    PARENT: {
        roleId: 1200,
        code: 'parent',
        name: 'parent',
        launchUrl: 'parentHome',
        feature: 'parentHome'
    },
    STUDENT: {
        roleId: 1000,
        code: 'student',
        name: 'student',
        launchUrl: 'studentHome',
        feature: 'studentHome'
    }
};



module.exports.DiaryMessageTypes = {

    HOMEWORK: {
        typeId: 1000,
        name: 'homework'
    },
    OTHERS: {
        typeId: 1000,
        name: 'others'
    }
};



module.exports.ModelDataTypes = {
    "OBJECT_ID":1,
    "DATE":2
};



module.exports.NotificationTargetType = {
    "SECTION_STUDENTS": {
        typeId: 1,
        name: 'All Students',
        editable:false
    },
    "SELECTED_SECTION_STUDENTS": {
        typeId: 2,
        name: 'Selected Students',
        editable:true
    },
    "SECTION_TEACHERS": {
        typeId: 3,
        name: 'All Teachers',
        editable:false
    },
    "SELECTED_SECTION_TEACHERS": {
        typeId: 4,
        name: 'Selected Teachers',
        editable:true
    }
};


module.exports.EventTargetType = {
    "SECTION_STUDENTS": {
        typeId: 1,
        name: 'All Students',
        editable:false
    },
    "SELECTED_SECTION_STUDENTS": {
        typeId: 2,
        name: 'Selected Students',
        editable:true
    },
    "SECTION_TEACHERS": {
        typeId: 3,
        name: 'All Teachers',
        editable:false
    },
    "SELECTED_SECTION_TEACHERS": {
        typeId: 4,
        name: 'Selected Teachers',
        editable:true
    }
};


module.exports.GenderType = {
    MALE:'male',
    FEMALE:'female'
};