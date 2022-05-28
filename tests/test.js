const {Tokenizer, Tokens, Token} = require("../tokenizer.js");

//var str = "  \\ \n \t \\  \n  %This is a comment\\\n \\MYVARNAMElul u";
var str = "this is ° Token";
var mstr = "";
for (var i = 0; i < 1; i++)
    mstr += str;

const startMillis = performance.now();
var tokenizer = new Tokenizer(mstr);
while (tokenizer.next()) {
    console.log(tokenizer.current);
    console.log("'" + tokenizer.current.data + "'")
    //console.log(tokenizer.current.data, " (ID: ", tokenizer.current.id, ")");
}
console.log("========================")
console.log("Total millis: ", performance.now() - startMillis, "ms")
console.log("Total chars: ", mstr.length);