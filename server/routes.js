/**
 * Main application routes
 */

'use strict';

var errors = require('./components/errors');
var path = require('path');
var loggeduser = require('./auth/loggeduser');

module.exports = function (app) {


    app.all('/*', function (req, res, next) {
        // CORS headers
        //res.header('Access-Control-Allow-Origin', '*'); // restrict it to the required domain
        //res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        res.header("Access-Control-Allow-Origin", "http://localhost:4000");
        res.header("Access-Control-Allow-Credentials", "true");
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE,OPTIONS");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept,Authorization");
        // Set custom headers for CORS
        //res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
        // When performing a cross domain request, you will recieve
        // a preflighted request first. This is to check if our the app
        // is safe.
        if (req.method == 'OPTIONS') {
            res.status(200).end();
        } else {
            next();
        }
    });

    // Insert routes below

    //app.use(extractloggedInfo);
    app.use("/api/*", loggeduser.validateAuthCredentials); // getting all information for requested user
    app.use('/api/constants', require('./api/dataconstants'));
    app.use('/api/users', require('./api/user'));
    app.use('/api/notificationuser', require('./api/notificationuser'));
    app.use('/api/mainmenuconfig', require('./api/mainmenuconfig'));
    app.use('/api/school', require('./api/school'));
    app.use('/api/schooluserrole', require('./api/schooluserrole'));
    app.use('/api/staff', require('./api/staff'));
    app.use('/api/student', require('./api/student'));
    app.use('/api/klass', require('./api/klass'));
    app.use('/api/klasssection', require('./api/klasssection'));
    app.use('/api/klasssectionstudent', require('./api/klasssectionstudent'));
    app.use('/api/parent', require('./api/parent'));
    app.use('/api/studentattendance', require('./api/studentattendance'));
    app.use('/api/studentbehaviour', require('./api/studentbehaviour'));
    app.use('/api/subjecttype', require('./api/subjecttype'));
    app.use('/api/klassperiod', require('./api/klassperiod'));
    app.use('/api/klasssectionsubject', require('./api/klasssectionsubject'));
    app.use('/api/timetable', require('./api/timetable'));
    app.use('/api/studentresult', require('./api/studentresult'));
    app.use('/api/academic', require('./api/academicyear'));
    app.use('/api/diary', require('./api/diary'));
    app.use('/api/newsfeed', require('./api/newsfeed'));
    app.use('/api/newsfeedcomment', require('./api/newsfeedcomment'));
    app.use('/api/event', require('./api/event'));
    app.use('/api/behaviouralattribute', require('./api/behaviouralattribute'));
    app.use('/api/behaviouralscore', require('./api/behaviouralscore'));
    app.use('/api/studentmark', require('./api/studentmark'));
    app.use('/api/klassholiday', require('./api/klassholiday'));
    app.use('/api/notificationinstance', require('./api/notificationinstance'));
    app.use('/api/notificationtargettypeinstance', require('./api/notificationtargettypeinstance'));
    app.use('/api/exam', require('./api/exam'));
    app.use('/api/examtype', require('./api/examtype'));
    app.use('/api/usersettings', require('./api/usersettings'));
    app.use('/api/principal', require('./api/principal'));
    app.use('/api/schoolcalendar', require('./api/schoolcalendar'));
    app.use('/auth/amazon', require('./api/amazon'));
    app.use('/auth/common', require('./api/common'));

    app.use('/auth', require('./auth'));
    app.use('/auth/otp', require('./api/userotp'));

    app.use('/unauth/constants', require('./unauth/dataconstants'));

    // All undefined asset or api routes should return a 404
    app.route('/:url(api|auth|components|app|bower_components|assets|files)/*')
        .get(errors[404]);

    // All other routes should redirect to the index.html
    app.route('/*')
        .get(function (req, res) {
            res.sendFile(path.resolve(app.get('appPath') + '/index.html'));
        });
};
