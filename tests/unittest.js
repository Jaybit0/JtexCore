const {JtexEnvironment} = require("../envutils.js");
const {Tokenizer, Tokens, Token} = require("../tokenizer.js");
const {Parser} = require("../parser.js");
const fs = require("fs");
const os = require("os");
const path = require("path");

var env = new JtexEnvironment(path.join(os.homedir(), ".jtex", "environments", "default")).init(force=true);

// Scan for .jtex and .tex files in unittests folder
var files = fs.readdirSync("./tests/unittests");
var jtexFiles = files.filter(f => f.endsWith(".jtex")).map(f => f.substring(0, f.length-5)).sort();
var texFiles = files.filter(f => f.endsWith(".tex")).map(f => f.substring(0, f.length-4)).sort();

// Alert if there are .jtex files without a .tex file
jtexFiles.filter(f => !texFiles.includes(f)).forEach(f => console.log("\u001b[31mMissing .tex file for '" + f + ".jtex'\u001b[0m"));

var testFiles = jtexFiles.filter(f => texFiles.includes(f));
var lastProgressWritten = false;

for (var i = 0; i < testFiles.length; i++) {
    process.stdout.write("\rProgress: " + i + " / " + testFiles.length);
    lastProgressWritten = true;
    var testFile = testFiles[i];
    var content = fs.readFileSync("./tests/unittests/" + testFile + ".jtex").toString();
    var parser = new Parser(env);
    var tokenizer = new Tokenizer(content);
    var dat = parser.parse(tokenizer);
    var tex = fs.readFileSync("./tests/unittests/" + testFile + ".tex").toString();
    if (dat != tex) {
        console.log("\r\u001b[31mTest failed for '" + testFile + ".jtex'\u001b[0m");
        lastProgressWritten = false;

        // Create a folder failedtests if it doesn't exist
        if (!fs.existsSync("./tests/failedtests")) {
            fs.mkdirSync("./tests/failedtests");
        }

        // Write the .tex file to the failedtests folder
        fs.writeFileSync("./tests/failedtests/" + testFile + ".tex", dat);

        console.log("\u001b[31mSee './tests/failedtests/" + testFile + ".tex' for the generated .tex file\u001b[0m");
        console.log("");
    }
}

console.log((lastProgressWritten ? "\r" : "") + "Progress: " + testFiles.length + " / " + testFiles.length);
