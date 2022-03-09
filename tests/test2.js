const fs = require("fs");
const {Tokenizer, Tokens, Token} = require("../tokenizer.js");
const {Parser} = require("../parser.js");

const content = fs.readFileSync("./tests/example.jtex").toString();
var tokenizer = new Tokenizer(content);
var parser = new Parser(tokenizer);
var dat = parser.parse();

fs.writeFile('./tests/out.tex', dat, err => {
    if (err) {
      console.error(err);
      return;
    }
    //file written successfully
  });