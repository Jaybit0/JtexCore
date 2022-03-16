const {Token, Tokenizer} = require("../tokenizer.js");
const {ParserToken, ParserTokens} = require("../parser_token.js");
const { Tokens } = require("../constants.js");
const { ParserError } = require("../errors/parser_error.js");

var defaultBrackets = {};
defaultBrackets[Tokens.PARENTHESIS_OPEN] = Tokens.PARENTHESIS_CLOSED;
defaultBrackets[Tokens.CURLY_BRACKET_OPEN] = Tokens.CURLY_BRACKET_CLOSED;
defaultBrackets[Tokens.SQUARE_BRACKET_OPEN] = Tokens.SQUARE_BRACKET_CLOSED;

function buildBracketTree(buffer, ctx, endChecker, allowCommands = true, brackets = defaultBrackets) {
    var bracketStack = [];
    var dataTree = {data: [], parent: null};
    var current = dataTree;

    while (ctx.parser.tokenizer.nextIgnoreWhitespacesAndComments()) {
        if (allowCommands && ctx.parser.parseJtexCommand(buffer, ctx))
            continue;
        if (ctx.parser.tokenizer.current.id in brackets) {
            bracketStack.push(ctx.parser.tokenizer.current.id);
            var subTree = {data: [], parent: current, bracket: ctx.parser.tokenizer.current.id};
            current.data.push(subTree);
            current = subTree;
        } else if (bracketStack.length != 0 && ctx.parser.tokenizer.current.id == brackets[bracketStack[bracketStack.length-1]]) {
            bracketStack.pop();
            current = current.parent;
        } else if (Object.values(brackets).includes(ctx.parser.tokenizer.current.id)) {
            throw new ParserError("Unexpected bracket while parsing the bracket-tree: " + ctx.parser.tokenizer.current.data)
                .init(ctx.parser.tokenizer.current);
        } else {
            current.data.push(ctx.parser.tokenizer.current);
        }

        if (bracketStack.length == 0 && endChecker(ctx.parser.tokenizer.current))
            break;
    }

    return dataTree;
}

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

exports.buildBracketTree = buildBracketTree;
exports.parseMathTree = parseMathTree;
exports.tokenizeSubstring = tokenizeSubstring;