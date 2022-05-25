const {JtexEnvironment} = require("../envutils.js");
const {Tokenizer, Tokens, Token} = require("../tokenizer.js");
const {Parser} = require("../parser.js");
const fs = require("fs");
const os = require("os");
const path = require("path");

var env = new JtexEnvironment(path.join(os.homedir(), ".jtex", "environments", "default")).init(force=true);

const content = fs.readFileSync("./tests/lina4.1.jtex").toString();

var parser = new Parser(env);
var tokenizer = new Tokenizer(content);

const startMillis = performance.now();

var dat = parser.parse(tokenizer);

console.log("========================")
console.log("Total millis: ", performance.now() - startMillis, "ms")
console.log("Total chars: ", content.length);

fs.writeFile('./tests/out.tex', dat, err => {
    if (err) {
        console.error(err);
        return;
    }
    //file written successfully
});