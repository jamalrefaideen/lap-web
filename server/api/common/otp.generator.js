
exports.generate = generateOTPNumber;

function generateOTPNumber(){
    return Math.round(Math.random() * (9000 - 1000) + 1000);

}
