const {Token} = require("../tokenizer.js");
const {ParserToken, ParserTokens} = require("../parser_tokens.js");

function parseMathTree(parse_tree, inline) {
    var binaryOperators = generateMathBinaryOperators(inline);
    var preprocessed_parse_tree = [];
    var parse_stack = [];

    // Preprocess data by parsing subtrees
    for (var i = 0; i < parse_tree.data.length; i++) {
        if (parse_tree.data[i] instanceof Token) {
            preprocessed_parse_tree.push(new ParserToken(-1).fromLexerToken(parse_tree.data[i]));
        } else {
            var parsed = parseMathTree(parse_tree.data[i], inline);
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

// Param: inline: if it is an inline expression
function generateMathBinaryOperators(inline) {
    var dict = {};
    dict[ParserTokens.FRACTION] = binaryOperatorFrac;
    dict[ParserTokens.MULTIPLY] = binaryOperatorMul;
    dict[ParserTokens.POWER] = binaryOperatorPow;
    dict[ParserTokens.INTEGRAL] = binaryOperatorIntegral;
    return (parse_tree, parse_stack, ptr) => {
        if (ptr == 0 || parse_tree.length <= ptr)
            return false;
        if (!(parse_tree[ptr].id in dict))
            return false;
        var op1 = parse_stack.pop();
        var op2 = parse_tree[ptr+1];
        var result = dict[parse_tree[ptr].id](op1, op2);
        if (result != null) {
            parse_stack.push(result);
            return true;
        }
        return false;
    };
}

// BINARY OPERATORS: take two tokens, return one token

function binaryOperatorFrac(op1, op2) {
    return new ParserToken(ParserTokens.STRING).at(op1, op2).withData("\\frac{" + op1.unwrap().toString() + "}{" + op2.unwrap().toString() + "}");
}

function binaryOperatorMul(op1, op2) {
    return new ParserToken(ParserToken.STRING).at(op1, op2).withData(op1.unwrap().toString() + " \\cdot " + op2.unwrap().toString());
}

function binaryOperatorPow(op1, op2) {
    return new ParserToken(ParserToken.STRING).at(op1, op2).withData(op1.unwrap().toString() + "^{" + op2.unwrap().toString() + "}");
}

function binaryOperatorIntegral(op1, op2) {
    return new ParserToken(ParserToken.STRING).at(op1, op2).withData("\\int_{" + op1.unwrap().toString() + "}^{" + op2.unwrap().toString() + "}");
}

exports.parseMathTree = parseMathTree;