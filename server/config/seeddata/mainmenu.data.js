/**
 * Populate DB with sample data on server start
 * to disable, edit config/environment/index.js, and set `seedDB: false`
 */

'use strict';

var CONSTANT = require('../../api/dataconstants/constants');
var MainMenuConfig = require('../../api/mainmenuconfig/mainmenuconfig.model');
var UserRoleTypesConst = CONSTANT.UserRoleTypes;

createLapAdminMenus();

createSchoolAdminMenus();

createPrincipalMenus();

createStaffMenus();

createParentMenus();

function createLapAdminMenus() {

    /////// Start of admin -  main menus  ////////

    var lapAdminRole = UserRoleTypesConst.LAP_ADMIN.name;
    MainMenuConfig.remove({role: lapAdminRole}, function (err, doc) {

        if (err) {
            console.error("Error occurred while removing lap admin menus");
        }

        var lapAdminMainMenuDataList = [
            {
                role: lapAdminRole,
                displayName: "Dashboard",
                viewUrl: "/admin/dashboard",
                refState: "admindashboard",
                tooltip: "Dashboard",
                order: 1,
                feature: "Dashboard",
                iconClass: "home",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-06.png",
                active: true
            },
           
            {
                role: lapAdminRole,
                displayName: "Schools",
                viewUrl: "/admin/schools",
                refState: "schools",
                tooltip: "Schools",
                order: 3,
                feature: "Schools",
                iconClass: "university",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/High-school-icon.png",
                active: false
            }
        ];

        MainMenuConfig.create(lapAdminMainMenuDataList, function (err, adminMainMenus) {

            if (err) {
                return console.error("Error occurred while creating lap admin menus");
            }

            console.log("Successfully created lap admin main menus");
        });
    });
    /////// End of admin -  main menus  ////////
}


function createSchoolAdminMenus() {

    /////// Start of schoolAdmin -  main menus  ////////

    var schoolAdminRole = UserRoleTypesConst.SCHOOL_ADMIN.name;
    MainMenuConfig.remove({role: schoolAdminRole}, function (err, doc) {

        if (err) {
            console.error("Error occurred while removing schoolAdmin menus");
        }

        var schoolAdminRoleMainMenuDataList = [

            {
                role: schoolAdminRole,
                displayName: "Dashboard",
                viewUrl: "/schoolAdmin/dashboard",
                refState: "schoolAdmindashboard",
                tooltip: "Dashboard",
                order: 1,
                feature: "Dashboard",
                iconClass: "home",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-06.png",
                active: true
            },
            {
                role: schoolAdminRole,
                displayName: "Academic Year",
                viewUrl: "/schoolAdmin/settings",
                refState: "settings",
                tooltip: "Academic Year",
                order: 2,
                feature: "Settings",
                iconClass: "settings",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-16.png",
                active: false
            },
            {
                role: schoolAdminRole,
                displayName: "Learning Traits",
                viewUrl: "/schoolAdmin/learningtraits",
                refState: "learningtraits",
                tooltip: "Learning Traits",
                order: 3,
                feature: "Learning Traits",
                iconClass: "settings",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-14.png",
                active: false
            },
            {
                role: schoolAdminRole,
                displayName: "Subjects",
                viewUrl: "/schoolAdmin/subjects",
                refState: "subjects",
                tooltip: "Subjects",
                order: 4,
                feature: "Subjects",
                iconClass: "subjects",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-13.png",
                active: false
            },

            {
                role: schoolAdminRole,
                displayName: "Staffs",
                viewUrl: "/schoolAdmin/staffs",
                refState: "staffs",
                tooltip: "Staffs",
                order: 5,
                feature: "Staffs",
                iconClass: "group",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-07.png",
                active: false
            },

            {
                role: schoolAdminRole,
                displayName: "Classes",
                viewUrl: "/schoolAdmin/classes",
                refState: "classes",
                tooltip: "Classes",
                order: 6,
                feature: "Classes",
                iconClass: "home",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-11.png",
                active: false
            },
            {
                role: schoolAdminRole,
                displayName: "Students",
                viewUrl: "/schoolAdmin/students",
                refState: "students",
                tooltip: "Students",
                order: 7,
                feature: "Students",
                iconClass: "child",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-08.png",
                active: false
            },
            {
                role: schoolAdminRole,
                displayName: "Period Index",
                viewUrl: "/schoolAdmin/timetable/classperiods",
                refState: "timetable",
                tooltip: "Period Index",
                order: 8,
                feature: "Period Index",
                iconClass: "table",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-10.png",
                active: false
            },
            {
                role: schoolAdminRole,
                displayName: "Time Table",
                viewUrl: "/schoolAdmin/timetable",
                refState: "timetable",
                tooltip: "Timetable",
                order: 9,
                feature: "Timetable",
                iconClass: "table",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-16.png",
                active: false
            },
            {
                role: schoolAdminRole,
                displayName: "Exams",
                viewUrl: "/schoolAdmin/exam",
                refState: "exam",
                tooltip: "Exam",
                order: 10,
                feature: "Exam",
                iconClass: "settings",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-15.png",
                active: false
            },
            {
                role: schoolAdminRole,
                displayName: "Principal",
                viewUrl: "/schoolAdmin/principal/view",
                refState: "principal",
                tooltip: "Principal",
                order: 11,
                feature: "Principal",
                iconClass: "settings",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-09.png",
                active: false
            },
            {
                role: schoolAdminRole,
                displayName: "Calendar Events",
                viewUrl: "/schoolAdmin/holidays",
                refState: "holiday",
                tooltip: "Calendar Events",
                order: 12,
                feature: "Holiday",
                iconClass: "settings",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-12.png",
                active: false
            }

        ];

        MainMenuConfig.create(schoolAdminRoleMainMenuDataList, function (err, schoolAdminMainMenus) {

            if (err) {
                return console.error("Error occurred while creating schoolAdmin menus");
            }

            console.log("Successfully created schoolAdmin main menus");
        });
    });
    /////// End of schoolAdmin -  main menus  ////////
}


function createPrincipalMenus() {

    /////// Start of principal -  main menus  ////////

    var principalRole = UserRoleTypesConst.PRINCIPAL.name;
    MainMenuConfig.remove({role: principalRole}, function (err, doc) {

        if (err) {
            console.error("Error occurred while removing principal menus");
        }

        var principalMainMenuDataList = [
            {
                role: principalRole,
                displayName: "Dashboard",
                viewUrl: "/principal/dashboard",
                refState: "principaldashboard",
                tooltip: "Dashboard",
                order: 1,
                feature: "Dashboard",
                iconClass: "home",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-06.png",
                active: true
            },
            {
                role: principalRole,
                displayName: "Enrollment",
                viewUrl: "/principal/enrollment",
                refState: "principalenrollment",
                tooltip: "Enrollment",
                order: 2,
                feature: "Enrollment",
                iconClass: "home",
                webIcon: "pencil-alt",
                active: false
            },
            {
                role: principalRole,
                displayName: "Exam Results",
                viewUrl: "/principal/examresults",
                refState: "principalexamresults",
                tooltip: "Exam Results",
                order: 3,
                feature: "Exam Results",
                iconClass: "settings",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-15.png",
                active: false
            },
            {
                role: principalRole,
                displayName: "Attendance",
                viewUrl: "/principal/attendance",
                refState: "principalAttendance",
                tooltip: "Attendance",
                order: 4,
                feature: "Attendance",
                iconClass: "ios-people",
                webIcon: "hand-stop",
                active: false
            },
            {
                role: principalRole,
                displayName: "Learning Trait",
                viewUrl: "/principal/learningTrait",
                refState: "principalLearningTrait",
                tooltip: "Learning Trait",
                order: 5,
                feature: "Learning Trait",
                iconClass: "ios-bulb",
                webIcon: "light-bulb",
                active: false
            },
            {
                role: principalRole,
                displayName: "Notifications",
                viewUrl: "/principal/notifications",
                refState: "principalNotifications",
                tooltip: "Notifications",
                order: 6,
                feature: "Notifications",
                iconClass: "ios-notifications",
                webIcon: "bell",
                active: false
            },
            {
                role: principalRole,
                displayName: "Timetable",
                viewUrl: "/principal/timetable",
                refState: "principalTimetable",
                tooltip: "Timetable",
                order: 7,
                feature: "Timetable",
                iconClass: "ios-timer",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-16.png",
                active: false
            },
            {
                role: principalRole,
                displayName: "Calendar",
                viewUrl: "/principal/calendar",
                refState: "principalCalendar",
                tooltip: "Calendar",
                order: 8,
                feature: "Calendar",
                iconClass: "ios-calendar",
                webIcon: "calendar",
                active: false
            },
            {
                role: principalRole,
                displayName: "News Feed",
                viewUrl: "/principal/feed",
                refState: "principalFeed",
                tooltip: "News Feed",
                order: 9,
                feature: "News Feed",
                iconClass: "ios-paper",
                webIcon: "comment-alt",
                active: false
            },
            {
                role: principalRole,
                displayName: "Settings",
                viewUrl: "/principal/settings",
                refState: "principalSettings",
                tooltip: "Settings",
                order: 10,
                feature: "Settings",
                iconClass: "ios-settings",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-14.png",
                active: false
            },
            {
                role:principalRole ,
                displayName: "Help & FAQs",
                viewUrl: "/principal/helpfaqs",
                refState: "principalHelp",
                tooltip: "HelpFaqs",
                order: 11,
                feature: "HelpFaqs",
                iconClass: "ios-browsers",
                webIcon: "world",
                active: false
            },
            {
                role: principalRole,
                displayName: "Chat",
                viewUrl: "/principal/chat",
                refState: "chat",
                tooltip: "Chat",
                order: 12,
                feature: "Chat",
                iconClass: "ios-chatboxes",
                webIcon: "comment-alt",
                active: false
            }
        ];

        MainMenuConfig.create(principalMainMenuDataList, function (err, principalMainMenus) {

            if (err) {
                return console.error("Error occurred while creating principal menus");
            }

            console.log("Successfully created principal main menus");
        });
    });
    /////// End of principal -  main menus  ////////

}


function createStaffMenus() {

    /////// Start of staff -  main menus  ////////

    var staffRole = UserRoleTypesConst.STAFF.name;
    MainMenuConfig.remove({role: staffRole}, function (err, doc) {

        if (err) {
            console.error("Error occurred while removing staff menus");
        }

        var staffMainMenuDataList = [
            {
                role: staffRole,
                displayName: "Dashboard",
                viewUrl: "/staff/dashboard",
                refState: "teacherDashboard",
                tooltip: "Dashboard",
                order: 1,
                feature: "Dashboard",
                iconClass: "home",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-06.png",
                active: true
            },
            {
                role: staffRole,
                displayName: "Attendance",
                viewUrl: "/staff/attendance",
                refState: "teacherAttendance",
                tooltip: "Attendance",
                order: 2,
                feature: "Attendance",
                iconClass: "ios-people",
                webIcon: "hand-stop",
                active: false
            },
            {
                role: staffRole,
                displayName: "Learning Trait",
                viewUrl: "/staff/learningTrait",
                refState: "teacherLearningTrait",
                tooltip: "Learning Trait",
                order: 3,
                feature: "Learning Trait",
                iconClass: "ios-bulb",
                webIcon: "light-bulb",
                active: false
            },
            {
                role: staffRole,
                displayName: "Notifications",
                viewUrl: "/staff/notifications",
                refState: "teacherNotification",
                tooltip: "Notifications",
                order: 4,
                feature: "Notifications",
                iconClass: "ios-notifications",
                webIcon: "bell",
                active: false
            },
            {
                role: staffRole,
                displayName: "Timetable",
                viewUrl: "/staff/timetable",
                refState: "teacherTimetable",
                tooltip: "Timetable",
                order: 5,
                feature: "Timetable",
                iconClass: "ios-timer",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-16.png",
                active: false
            },
            {
                role: staffRole,
                displayName: "Calendar",
                viewUrl: "/staff/calendar",
                refState: "teacherCalendar",
                tooltip: "Calendar",
                order: 6,
                feature: "Calendar",
                iconClass: "ios-calendar",
                webIcon: "calendar",
                active: false
            },
            {
                role: staffRole,
                displayName: "Results",
                viewUrl: "/staff/results",
                refState: "teacherResults",
                tooltip: "Results",
                order: 7,
                feature: "Results",
                iconClass: "ios-star-half",
                webIcon: "pulse",
                active: false
            },
            {
                role: staffRole,
                displayName: "Diary",
                viewUrl: "/staff/diary",
                refState: "teacherDiary",
                tooltip: "Diary",
                order: 8,
                feature: "Diary",
                iconClass: "ios-book",
                webIcon: "notepad",
                active: false
            },
            {
                role: staffRole,
                displayName: "News Feed",
                viewUrl: "/staff/feed",
                refState: "teacherFeed",
                tooltip: "News Feed",
                order: 9,
                feature: "News Feed",
                iconClass: "ios-paper",
                webIcon: "comment-alt",
                active: false
            },
            {
                role: staffRole,
                displayName: "Settings",
                viewUrl: "/staff/settings",
                refState: "teacherSettings",
                tooltip: "Settings",
                order: 10,
                feature: "Settings",
                iconClass: "ios-settings",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-14.png",
                active: false
            },
            {
                role:staffRole ,
                displayName: "Help & FAQs",
                viewUrl: "/staff/helpfaqs",
                refState: "teacherHelp",
                tooltip: "HelpFaqs",
                order: 11,
                feature: "HelpFaqs",
                iconClass: "ios-browsers",
                webIcon: "world",
                active: false
            },
            {
                role: staffRole,
                displayName: "Chat",
                viewUrl: "/staff/chat",
                refState: "chat",
                tooltip: "Chat",
                order: 12,
                feature: "Chat",
                iconClass: "ios-chatboxes",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-14.png",
                active: false
            }
        ];

        MainMenuConfig.create(staffMainMenuDataList, function (err, staffMainMenus) {

            if (err) {
                return console.error("Error occurred while creating staff menus");
            }

            console.log("Successfully created staff main menus");
        });
    });
    /////// End of staff -  main menus  ////////
}


function createParentMenus() {

    /////// Start of parent -  main menus  ////////

    var parentRole = UserRoleTypesConst.PARENT.name;
    MainMenuConfig.remove({role: parentRole}, function (err, doc) {

        if (err) {
            console.error("Error occurred while removing parent menus");
        }

        var parentMainMenuDataList = [
            {
                role: parentRole,
                displayName: "Dashboard",
                viewUrl: "/parent/dashboard",
                refState: "dashboard",
                tooltip: "Dashboard",
                order: 1,
                feature: "Dashboard",
                iconClass: "home",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-06.png",
                active: true
            },
            {
                role: parentRole,
                displayName: "Attendance",
                viewUrl: "/parent/attendance",
                refState: "attendance",
                tooltip: "Attendance",
                order: 2,
                feature: "Attendance",
                iconClass: "ios-people",
                webIcon: "hand-stop",
                active: false
            },
            {
                role: parentRole,
                displayName: "Learning Trait",
                viewUrl: "/parent/learningTrait",
                refState: "learningTrait",
                tooltip: "Learning Trait",
                order: 3,
                feature: "Learning Trait",
                iconClass: "ios-bulb",
                webIcon: "light-bulb",
                active: false
            },
            {
                role: parentRole,
                displayName: "Notifications",
                viewUrl: "/parent/notifications",
                refState: "notification",
                tooltip: "Notifications",
                order: 4,
                feature: "Notifications",
                iconClass: "ios-notifications",
                webIcon: "bell",
                active: false
            },
            {
                role: parentRole,
                displayName: "Timetable",
                viewUrl: "/parent/timetable",
                refState: "timetable",
                tooltip: "Timetable",
                order: 5,
                feature: "Timetable",
                iconClass: "ios-timer",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-16.png",
                active: false
            },
            {
                role: parentRole,
                displayName: "Calendar",
                viewUrl: "/parent/calendar",
                refState: "calendar",
                tooltip: "Calendar",
                order: 6,
                feature: "Calendar",
                iconClass: "ios-calendar",
                webIcon: "calendar",
                active: false
            },
            {
                role: parentRole,
                displayName: "Results",
                viewUrl: "/parent/results",
                refState: "results",
                tooltip: "Results",
                order: 7,
                feature: "Results",
                iconClass: "ios-star-half",
                webIcon: "pulse",
                active: false
            },
            {
                role: parentRole,
                displayName: "Diary",
                viewUrl: "/parent/diary",
                refState: "diary",
                tooltip: "Diary",
                order: 8,
                feature: "Diary",
                iconClass: "ios-book",
                webIcon: "notepad",
                active: false
            },
            {
                role: parentRole,
                displayName: "News Feed",
                viewUrl: "/parent/feed",
                refState: "feed",
                tooltip: "News Feed",
                order: 9,
                feature: "News Feed",
                iconClass: "ios-paper",
                webIcon: "comment-alt",
                active: false
            },
            {
                role: parentRole,
                displayName: "Settings",
                viewUrl: "/parent/settings",
                refState: "settings",
                tooltip: "Settings",
                order: 10,
                feature: "Settings",
                iconClass: "ios-settings",
                webIcon: "http://letzlap.s3-ap-south-1.amazonaws.com/lap-icons/icons-14.png",
                active: false
            },
            {
                role: parentRole,
                displayName: "Contact us",
                viewUrl: "/parent/contactus",
                refState: "contactus",
                tooltip: "ContactUs",
                order: 11,
                feature: "ContactUs",
                iconClass: "ios-contact",
                webIcon: "id-badge",
                active: false
            },
            {
                role: parentRole,
                displayName: "Help & FAQs",
                viewUrl: "/parent/helpfaqs",
                refState: "faqs",
                tooltip: "HelpFaqs",
                order: 12,
                feature: "HelpFaqs",
                iconClass: "ios-browsers",
                webIcon: "world",
                active: false
            },
            {
                role: parentRole,
                displayName: "Chat",
                viewUrl: "/parent/chat",
                refState: "chat",
                tooltip: "Chat",
                order: 13,
                feature: "Chat",
                iconClass: "ios-chatboxes",
                webIcon: "world",
                active: false
            }
        ];

        MainMenuConfig.create(parentMainMenuDataList, function (err, parentMainMenus) {

            if (err) {
                return console.error("Error occurred while creating parent menus");
            }

            console.log("Successfully created parent main menus");
        });
    });
    /////// End of parent -  main menus  ////////
}
