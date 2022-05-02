const fs = require("fs");
const {Tokenizer, Tokens, Token} = require("../tokenizer.js");
const {Parser} = require("../parser.js");

const content = fs.readFileSync("./tests/example.jtex").toString();

const startMillis = performance.now();

var tokenizer = new Tokenizer(content);
var parser = new Parser(tokenizer);
var dat = parser.parse();

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