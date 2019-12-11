
var jsonGenerator = require('./testDataGenerator');

exports.generateJsonFiles = function( req, res ) {

    jsonGenerator.generateJsonFiles(function(err,data){

        if(err) return res.status(200).send(err.message);

        res.status(200).send({message:"Json generated successfully!"});
    });
};
