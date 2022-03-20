const {Token, Tokenizer} = require("../tokenizer.js");
const {ParserToken, ParserTokens} = require("../parser_token.js");
const { Tokens } = require("../constants.js");
const { ParserError } = require("../errors/parser_error.js");

var defaultBrackets = {};
defaultBrackets[Tokens.PARENTHESIS_OPEN] = Tokens.PARENTHESIS_CLOSED;
defaultBrackets[Tokens.CURLY_BRACKET_OPEN] = Tokens.CURLY_BRACKET_CLOSED;
defaultBrackets[Tokens.SQUARE_BRACKET_OPEN] = Tokens.SQUARE_BRACKET_CLOSED;

/**
 * Builds a tree-structure from the next tokens.
 * @param {LineBuffer} buffer a line buffer 
 * @param {ParserContext} ctx the parser context 
 * @param {function(Token): boolean} endChecker a function that checks whether the current token indicates the end of the tree
 * @param {boolean} allowCommands whether commands should be interpreted
 * @param {any} brackets a map of opening and closing brackets (example: {'(': ')'})
 * @returns the bracket-tree of the form {'data': [token1, tree-node, token2, ...], 'parent': parent-tree-node}
 */
function buildBracketTree(buffer, ctx, endChecker, allowCommands = true, brackets = defaultBrackets) {
    var bracketStack = [];
    var dataTree = {data: [], parent: null};
    var current = dataTree;

    while (ctx.parser.tokenizer.next()) {
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

        if (bracketStack.length == 0 && endChecker(ctx.parser.tokenizer.current)) {
            current.data.pop();
            break;
        }
    }

    return dataTree;
}

/**
 * 
 * @param {any} parse_tree the parsed tree as it is returned from the function 'buildBracketTree'
 * @param {boolean} inline whether the math-mode is inline
 * @param {function(any, Token[], int): boolean} binaryOperators the binary-operator handler-function
 * @param {function(any, Token[], int): boolean} singleOperators the single-operator handler-function
 * @returns an array of output-tokens
 */
function parseMathTree(parse_tree, inline, binaryOperators, singleOperators) {
    var preprocessed_parse_tree = [];
    var parse_stack = [];

    // Preprocess data by parsing subtrees
    for (var i = 0; i < parse_tree.data.length; i++) {
        if (parse_tree.data[i] instanceof Token) {
            preprocessed_parse_tree.push(new ParserToken(-1).fromLexerToken(parse_tree.data[i]));
        } else {
            var parsed = parseMathTree(parse_tree.data[i], inline, binaryOperators, singleOperators);
            var data = parsed.map(tk => tk.toString()).join("")
            preprocessed_parse_tree.push(new ParserToken(ParserTokens.STRING).withData(data).at(parsed[0].beginToken, parsed[parsed.length-1].endToken).wrap());
        }
    }
    
    // Evaluate operators
    for (var i = 0; i < preprocessed_parse_tree.length; i++) {
        if (binaryOperators(preprocessed_parse_tree, parse_stack, i)) {
            i++;
        } else if (singleOperators(preprocessed_parse_tree, parse_stack, i)) {
            continue;
        } else {
            parse_stack.push(preprocessed_parse_tree[i]);
        }
    }
    return parse_stack;
}

/**
 * Tokenizes a string using the Jtex-tokenizer.
 * @param {string} str the string to be tokenized
 * @param {Token} refToken a reference-token to keep track of positions in the actual input-file
 * @returns a token-list
 */
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