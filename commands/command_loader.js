const fs = require("fs");
const fUtils = require("../utils/file_utils.js");

/**
 * Dynamically loads all commands from all directories / subdirectories specified in 'locations'
 * @param {JtexEnvironment} env the environment
 * @returns a list of commands
 */
function loadCommands(env) {
    commands = [];
    for (const f of env.getJtexCommandFiles()) {
        try {
            commands.push(...require(f)(env));
        } catch (err) {
            console.error("Could not load commands from file:", f);
            console.error(err);
        }
    }
    return commands;
}

exports.loadCommands = loadCommands;