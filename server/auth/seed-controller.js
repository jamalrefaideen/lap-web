var masterSeedGenrator = require("../config/seeddata/master_seeddata");
exports.generateCalendersSeed = function (req, res) {

    masterSeedGenrator.generate()
        .then(function () {
            res.status(200).send("Success")
        })
        .catch(function (err) {
            res.status(500).send(err)
        })

}