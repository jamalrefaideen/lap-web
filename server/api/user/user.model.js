'use strict';

var mongoose = require('mongoose');
var async = require("async");
var Schema = mongoose.Schema;
var crypto = require('crypto');
var authTypes = ['github', 'twitter', 'facebook', 'google'];

var UserSchema = new Schema({
    schoolId: {type: Schema.Types.ObjectId, ref: 'School'},
    name: String,
    email: {type: String, lowercase: true},
    mobileNumber: Number,
    profilePictureUrl: String,
    hashedPassword: String,
    provider: String,
    salt: String,
    activated: {type: Boolean, default: false},
    isDeleted: {type:Boolean, default:false},
    isLapAdmin: {type: Boolean, default: false},
    createdOn: {type: Date, default: Date.now},
    modifiedOn: Date
});

/**
 * Virtuals
 */
UserSchema
    .virtual('password')
    .set(function (password) {
        this._password = password;
        this.salt = this.makeSalt();
        this.hashedPassword = this.encryptPassword(password);
    })
    .get(function () {
        return this._password;
    });

// Public profile information
UserSchema
    .virtual('profile')
    .get(function () {
        return {
            'name': this.name,
            'role': this.role
        };
    });

// Non-sensitive info we'll be putting in the token
UserSchema
    .virtual('token')
    .get(function () {
        return {
            '_id': this._id,
            'role': this.role
        };
    });

/**
 * Validations
 */

// Validate empty email
UserSchema
    .path('email')
    .validate(function (email) {
        if (authTypes.indexOf(this.provider) !== -1) return true;
        return email.length;
    }, 'Email cannot be blank');

// Validate empty password
UserSchema
    .path('hashedPassword')
    .validate(function (hashedPassword) {
        if (authTypes.indexOf(this.provider) !== -1) return true;
        return hashedPassword.length;
    }, 'Password cannot be blank');

/*// Validate email is not taken
UserSchema
    .path('email')
    .validate(function (value, respond) {
        var self = this;
        var query = {email: value, schoolId: this.schoolId};
        this.constructor.findOne(query, function (err, user) {
            if (err) throw err;
            if (user) {
                if (self.id === user.id) return respond(true);
                return respond(false);
            }
            respond(true);
        });
    }, 'The specified email address is already in use.');*/

// Validate mobileNumber is not taken
/*
UserSchema
    .path('mobileNumber')
    .validate(function (value, respond) {
        var self = this;
        var query = {mobileNumber: value, schoolId: this.schoolId};
        this.constructor.findOne(query, function (err, user) {
            if (err) throw err;
            if (user) {
                if (self.id === user.id) return respond(true);
                return respond(false);
            }
            respond(true);
        });
    }, 'The specified mobile number is already in use.');
*/

var validatePresenceOf = function (value) {
    return value && value.length;
};

/**
 * Pre-save hook
 */
UserSchema
    .pre('save', function (next) {
        if (!this.isNew) return next();

        if (!validatePresenceOf(this.hashedPassword) && authTypes.indexOf(this.provider) === -1)
            next(new Error('Invalid password'));
        else
            next();
    });

/**
 * Methods
 */
UserSchema.methods = {
    /**
     * Authenticate - check if the passwords are the same
     *
     * @param {String} plainText
     * @return {Boolean}
     * @api public
     */
    authenticate: function (plainText) {
        return this.encryptPassword(plainText) === this.hashedPassword;
    },

    /**
     * Make salt
     *
     * @return {String}
     * @api public
     */
    makeSalt: function () {
        return crypto.randomBytes(16).toString('base64');
    },

    /**
     * Encrypt password
     *
     * @param {String} password
     * @return {String}
     * @api public
     */
    encryptPassword: function (password) {
        if (!password || !this.salt) return '';
        var salt = new Buffer(this.salt, 'base64');
        return crypto.pbkdf2Sync(password, salt, 10000, 64).toString('base64');
    }
};


UserSchema.statics.findDetails = function (accountId, userId, callBack) {

    async.waterfall([

        function (next) {

            var findQuery = {
                'accountId': accountId,
                'userId': userId
            };

            var AccountUser = require("../accountuser/accountuser.model");
            AccountUser.findOne(findQuery)
                .populate("userId")
                .lean()
                .exec(next);
        },

        function (accountUser, next) {

            var userData = accountUser.userId;
            userData.role = accountUser.role;
            userData.active = accountUser.active;

            return next(null, userData);
        }

    ], callBack);
};


module.exports = mongoose.model('User', UserSchema);



var a=[3,4]
var b=[1,2,3]
var c=[1,2,3,4]