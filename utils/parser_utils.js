const {Token, Tokenizer} = require("../tokenizer.js");
const {ParserToken, ParserTokens} = require("../parser_token.js");

function parseMathTree(parse_tree, inline, binaryOperators) {
    var preprocessed_parse_tree = [];
    var parse_stack = [];

    // Preprocess data by parsing subtrees
    for (var i = 0; i < parse_tree.data.length; i++) {
        if (parse_tree.data[i] instanceof Token) {
            preprocessed_parse_tree.push(new ParserToken(-1).fromLexerToken(parse_tree.data[i]));
        } else {
            var parsed = parseMathTree(parse_tree.data[i], inline, binaryOperators);
            var data = parsed.map(tk => tk.toString()).join("")
            preprocessed_parse_tree.push(new ParserToken(ParserTokens.STRING).withData(data).at(parsed[0].beginToken, parsed[parsed.length-1].endToken).wrap());
        }
    }
    
    // Evaluate operators
    for (var i = 0; i < preprocessed_parse_tree.length; i++) {
        if (binaryOperators(preprocessed_parse_tree, parse_stack, i)) {
            i++;
        } else {
            parse_stack.push(preprocessed_parse_tree[i]);
        }
    }
    return parse_stack;
}

function tokenizeSubstring(str, refToken) {
    var tokenizer = new Tokenizer(str);
    tokenizer.activateTokenBuffer(false);
    var tokens = [];
    while (tokenizer.next())
        tokens.push(tokenizer.current);
    tokens.forEach(val => {val.line = refToken.line; val.col = refToken.col; val.idx = refToken.idx;});
    return tokens;
}

exports.parseMathTree = parseMathTree;
exports.tokenizeSubstring = tokenizeSubstring;