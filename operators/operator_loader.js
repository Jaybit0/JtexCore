const fs = require("fs");
const fUtils = require("../utils/file_utils.js");

const locations = ["./operators/binary", "./operators/single"];

/**
 * Dynamically loads all operators from all directories / subdirectories specified in 'locations'
 * @returns a list of operators
 */
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