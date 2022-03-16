const fs = require("fs");
const fUtils = require("../utils/file_utils.js");

const locations = ["./commands/default"];

function loadCommands() {
    commands = [];
    for (var loc of locations) {
        for (var f of fUtils.getFiles(loc)) {
            try {
                commands.push(...require("..\\" + f).generate());
            } catch (err) {
                console.error("Could not load commands from file:", f);
                console.error(err);
            }
        }
    }
    return commands;
}

exports.loadCommands = loadCommands;