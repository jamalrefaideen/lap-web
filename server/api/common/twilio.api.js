var Promise = require('bluebird');
// Twilio Credentials
const accountSid = 'ACcfdf0f4fb392d05d3d5cbd78f4cedc64';
const authToken = 'b74baeddb78acf69adbe4a9e71908d07';
const FROM_MOBILE_NUMBER = "+16672132272";



// require the Twilio module and create a REST client
const client = require('twilio')(accountSid, authToken);


exports.sendSMS = function (to, body) {
    return new Promise(function (resolve, reject) {
        client.messages.create(
            {
                to: '+91' + to,
                from: FROM_MOBILE_NUMBER,
                body: body
            },
            function (err, message) {
                if (err) {
                    console.log(err);
                    return reject(err);
                }
                resolve(message);
            }
        );
    });

}
