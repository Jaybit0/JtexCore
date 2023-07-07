const {Token, Tokenizer} = require("../tokenizer.js");
const {ParserToken, ParserTokens} = require("../parser_token.js");
const { Tokens } = require("../constants.js");
const { ParserError } = require("../errors/parser_error.js");
const { Tuple } = require("../datastructures/Tuple.js");
const { TokenCollection } = require("../datastructures/TokenCollection.js");

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
 * @param {Array<Token>} tokenBuffer the token buffer that contains the original tokens as a sequential list
 * @returns the bracket-tree of the form {'data': [token1, tree-node, token2, ...], 'parent': parent-tree-node}
 */
function buildBracketTree(buffer, ctx, endChecker, allowCommands = true, brackets = defaultBrackets, tokenBuffer = null, linker = null) {
    if (tokenBuffer != null && allowCommands)
        throw new ParserError("Cannot buffer tokens and parse JTeX-Commands at the same time! This would lead to bugs in the parser and is therefore prohibited.");
    if (linker != null && tokenBuffer == null)
        throw new ParserError("Cannot use linker without token buffer!");

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
            // Prevent empty subtrees by pushing an empty string-token
            if (current.data.length == 0) {
                current.data.push(new Token(Tokens.EMPTY).withData("").initFrom(ctx.parser.tokenizer.current));
            }

            bracketStack.pop();
            current = current.parent;
        } else if (bracketStack.length == 0 && endChecker(ctx.parser.tokenizer.current)) {
            // current.data.pop();
            break;
        } else if (Object.values(brackets).includes(ctx.parser.tokenizer.current.id)) {
            throw new ParserError("Unexpected bracket while parsing the bracket-tree: " + ctx.parser.tokenizer.current.data)
                .init(ctx.parser.tokenizer.current);
        } else {
            current.data.push(ctx.parser.tokenizer.current);
        }

        if (tokenBuffer != null)
            tokenBuffer.push(ctx.parser.tokenizer.current);
        if (linker != null && bracketStack.length == 0)
            linker.push(tokenBuffer.length-1);
    }

    return dataTree;
}

/**
 * 
 * @param {any} parse_tree the parsed tree as it is returned from the function 'buildBracketTree'
 * @param {boolean} inline whether the math-mode is inline
 * @param {function(any, Token[], int, function(int): int): boolean} binaryOperators the binary-operator handler-function
 * @param {function(any, Token[], int, function(int): int): boolean} unaryOperators the unary-operator handler-function
 * @param {function(any, Token[], int, function(int): int): boolean} singleOperators the single-operator handler-function
 * @param {Array<Token>} tokenBuffer the token buffer that contains the original tokens as a sequential list
 * @returns an array of output-tokens
 */
function parseMathTree(parse_tree, inline, binaryOperators, unaryOperators, singleOperators, tokenBuffer = null) {
    var preprocessed_parse_tree = [];
    var parse_stack = [];

    // Preprocess data by parsing subtrees
    for (var i = 0; i < parse_tree.data.length; i++) {
        if (parse_tree.data[i] instanceof Token) {
            var parserToken = new ParserToken(-1).fromLexerToken(parse_tree.data[i]);
            preprocessed_parse_tree.push(parserToken);
            tokenBuffer?.append(parserToken);
        } else {
            var parsed = parseMathTree(parse_tree.data[i], inline, binaryOperators, unaryOperators, singleOperators, tokenBuffer);
            var data = parsed.map(tk => tk.toString()).join("");
            var parserToken = new ParserToken(ParserTokens.STRING).withData(data).at(parsed[0].beginToken, parsed[parsed.length-1].endToken).wrap();
            preprocessed_parse_tree.push(parserToken);
            tokenBuffer?.append(parserToken);
        }
    }
    
    // Evaluate operators
    for (var i = 0; i < preprocessed_parse_tree.length; i++) {
        if (binaryOperators(preprocessed_parse_tree, parse_stack, i, (m) => {i+=m; return i;})) {
            i++;
        } else if (unaryOperators(preprocessed_parse_tree, parse_stack, i, (m) => {i+=m; return i;})) {
            i++;
        } else if (singleOperators(preprocessed_parse_tree, parse_stack, i, (m) => {i+=m; return i;})) {
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

/**
 * Parses many optional parameters.
 * @param {LineBuffer} buffer a line-buffer
 * @param {ParserContext} ctx the parser-context
 * @returns a list of parsed optional parameters
 */
function parseOptionalParameters(buffer, ctx) {
    var params = [];
    for (var param = parseOptionalParameter(buffer, ctx); param != null; param = parseOptionalParameter(buffer, ctx)) {
        params.push(param);
    }
    return params;
}

/**
 * Parses an optional parameter if available. 
 * If no optional parameter is available, the
 * tokenizer-state will be restored to the next token.
 * @param {LineBuffer} buffer a line-buffer
 * @param {ParserContext} ctx the parser-context
 * @returns the parsed optional parameter or null if not available
 */
function parseOptionalParameter(buffer, ctx) {
    var localTokenQueue = [];
    while (ctx.parser.tokenizer.next()) {
        localTokenQueue.push(ctx.parser.tokenizer.current);
        if (!ctx.parser.tokenizer.currentTokenWhitespaceOrComment())
            break;
    }
    if (ctx.parser.tokenizer.current.id != Tokens.DOT) {
        ctx.parser.tokenizer.queueTokens(localTokenQueue);
        return null;
    }
    if (!ctx.parser.tokenizer.nextIgnoreWhitespacesAndComments() || ctx.parser.tokenizer.current.id != Tokens.VARNAME) 
        throw new ParserError("Expected optional parameter after dot.").init(ctx.parser.tokenizer.current);
    var param = ctx.parser.tokenizer.current;
    var tuple = parseTuple(buffer, ctx);
    return {"param": param, "args": tuple == null ? [] : tuple};
}

/**
 * Parses a tuple.
 * @param {LineBuffer} buffer a line-buffer
 * @param {ParserContext} ctx the parser-context
 * @returns the parsed tuple or null if not available
 */
function parseTuple(buffer, ctx) {
    if (!ctx.parser.tokenizer.nextIgnoreWhitespacesAndComments() || ctx.parser.tokenizer.current.id != Tokens.PARENTHESIS_OPEN) {
        ctx.parser.tokenizer.queueToken(ctx.parser.tokenizer.current);
        return null;
    }
    var dataStack = [[new TokenCollection([ctx.parser.tokenizer.current], true)]];
    var entryStack = [[]];
    var curEntry = entryStack[0];
    while (ctx.parser.tokenizer.next()) {
        switch (ctx.parser.tokenizer.current.id) {
            case Tokens.PARENTHESIS_OPEN:
                curEntry = [];
                entryStack.push(curEntry);
                dataStack.push([]);
                dataStack[dataStack.length-1].push(new TokenCollection([ctx.parser.tokenizer.current], true));
                break;
            case Tokens.PARENTHESIS_CLOSED:
                if (curEntry.length != 0)
                    dataStack[dataStack.length-1].push(new TokenCollection(entryStack.pop()));

                dataStack[dataStack.length-1].push(new TokenCollection([ctx.parser.tokenizer.current], true));
                var curStack = dataStack.pop();
                if (dataStack.length == 0) {
                    return new Tuple(curStack);
                } else {
                    curEntry = entryStack[entryStack.length-1];
                    curEntry.push(new Tuple(curStack));
                    break;
                }
            case Tokens.COMMA:
                dataStack[dataStack.length-1].push(new TokenCollection(entryStack.pop()));
                dataStack[dataStack.length-1].push(new TokenCollection([ctx.parser.tokenizer.current], true));
                curEntry = [];
                entryStack.push(curEntry);
                break;
            default:
                curEntry.push(ctx.parser.tokenizer.current);
                break;
        }
    }
}

/**
 * Stringifies a token-list.
 * @param {Token[]} tokens 
 * @returns 
 */
function stringify(tokens) {
    var str = "";
    for (var token of tokens) {
        str += token.toString();
    }
    return str;
}

exports.buildBracketTree = buildBracketTree;
exports.parseMathTree = parseMathTree;
exports.tokenizeSubstring = tokenizeSubstring;
exports.parseOptionalParameters = parseOptionalParameters;
exports.parseOptionalParameter = parseOptionalParameter;
exports.parseTuple = parseTuple;
exports.stringify = stringify;