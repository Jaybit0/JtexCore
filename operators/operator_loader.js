const fs = require("fs");
const fUtils = require("../utils/file_utils.js");

const locations = ["./operators/binary"];

function loadOperators() {
    operatorGenerators = [];
    for (var loc of locations) {
        for (var f of fUtils.getFiles(loc)) {
            try {
                operatorGenerators.push(...require("..\\" + f).generate());
            } catch (err) {
                console.error("Could not load operators from file:", f);
                console.error(err);
            }
        }
    }
    return operatorGenerators;
}

exports.loadOperators = loadOperators;