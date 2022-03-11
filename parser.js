const {Tokenizer, Tokens, Token, LineBuffer, splitLinebreaks} = require("./tokenizer.js");
const {ParserTokens, ParserToken} = require("./parser_tokens.js");

class Parser {
    constructor(tokenizer) {
        this.tokenizer = tokenizer;
        this.commandList = {};
    }

    /**
     * 
     * @param { [int] } token_id the id of the command-token after '--'
     * @param { [function(ParserToken): boolean] } checker a checker function to determine if the token represents the command
     * @param { [function(LineBuffer, ParserToken, Parser): void] } handler a handler function to convert the command to a string
     */
    initCommand(token_id, checker, handler) {

    }

    parse(lineBreak = "\r\n") {
        var buffer = new LineBuffer();
        this.tokenizer.activateTokenBuffer(true);
        this.parseUse(buffer);
        this.tokenizer.activateTokenBuffer(true);
        this.tokenizer.pushToTokenBuffer(new Token(Tokens.WHITESPACE).initFull(-1, -1, -1, 2, "\n\n"));
        this.tokenizer.pushToTokenBuffer(this.tokenizer.current);
        this.parseMain(buffer);
        return buffer.toString(lineBreak);
    }

    parseUse(buffer) {
        var managedImports = [];
        if (!this.tokenizer.nextIgnoreWhitespacesAndComments())
            return;
        while (this.parseUseExpr(managedImports))
            continue;
        for (var mImport of managedImports) {
            if (mImport.comments.length != 0)
                buffer.appendMany(mImport.comments);
            buffer.appendNewLine("\\usepackage{" + mImport.package + "}");
        }
    }

    parseUseExpr(managedImports) {
        if (this.tokenizer.current.id != Tokens.USE)
            return false;
        if (!this.tokenizer.nextIgnoreWhitespacesAndComments())
            return false;
        if (this.tokenizer.current.id != Tokens.VARNAME)
            throw new ParserError("A package name was expected. Given: " + this.tokenizer.current.data).init(this.tokenizer.current);
        var mImport = {
            package: this.tokenizer.current.data,
            comments: splitLinebreaks(this.tokenizer.resolveTokenBuffer(0, x => (x.id == Tokens.COMMENT || x.id == Tokens.BLOCK_COMMENT)))
        };
        managedImports.push(mImport);
        while (this.tokenizer.nextIgnoreWhitespacesAndComments()) {
            if (this.tokenizer.current.id != Tokens.COMMA)
                break;
            if (!this.tokenizer.nextIgnoreWhitespacesAndComments())
                return false;
            mImport = {
                package: this.tokenizer.current.data,
                comments: this.tokenizer.popComments()
            };
            managedImports.push(mImport);
        }
        return true;
    }

    parseMain(buffer) {
        while (this.tokenizer.nextIgnoreWhitespacesAndComments()) {
            if (this.tokenizer.current.id == Tokens.DOUBLE_DASH) {
                var res = this.tokenizer.resolveTokenBuffer(1);
                var lb = splitLinebreaks(res);
                buffer.appendMany(lb);
                var bufferActive = this.tokenizer.isTokenBufferActive();
                this.tokenizer.activateTokenBuffer(false);
                this.parseJtexCommand(buffer);
                this.tokenizer.activateTokenBuffer(bufferActive);
            }
        }
        buffer.appendMany(splitLinebreaks(this.tokenizer.resolveTokenBuffer()));
    }

    parseJtexCommand(buffer) {
        if (!this.tokenizer.next())
            throw new ParserError("A jtex-command was expected. Given: " + this.tokenizer.current.data).init(this.tokenizer.current);
        switch(this.tokenizer.current.id) {
            case Tokens.WHITESPACE:
                this.parseJtexMathInline(buffer);
                break;
            default:
                throw new ParserError("?").init(this.tokenizer.current);
        }
    }

    parseJtexMathInline(buffer) {
        var bracketCount = 0;
        var dataTree = {data: [], parent: null};
        var current = dataTree;
        while (this.tokenizer.nextIgnoreWhitespacesAndComments()) {
            if (this.tokenizer.current.id == Tokens.PARENTHESIS_OPEN) {
                bracketCount++;
                var subTree = {data: [], parent: current};
                current.data.push(subTree);
                current = subTree;
            } else if (this.tokenizer.current.id == Tokens.PARENTHESIS_CLOSED) {
                bracketCount--;
                current = current.parent;
            } else if (this.tokenizer.current.id == Tokens.SEMICOLON && bracketCount == 0) {
                break;
            } else {
                current.data.push(this.tokenizer.current);
            }
        }
        if (bracketCount != 0)
            throw new ParserError("Bracket error").init(this.tokenizer.current);
        // Traverse through tree-node elements to check for parseable objects
        var wrapperTree = {data: [dataTree], parent: null};
        dataTree.parent = wrapperTree;
        var mtree = parseMathTree(wrapperTree, true)[0];
        buffer.append("$" + mtree.unwrap().toString() + "$");
    }
}

class ParserError extends Error {
    constructor(msg) {
        super(msg);
        this.msg = msg;
        this.token = null;
    }

    init(token) {
        this.token = token;
    }

    toString() {
        var ret = [
            "A parser error occured" + (this.token != null ? " (line: " + this.token.line + ", column: " + this.token.col + ")." : "."),
            "Reason: " + (this.msg != null ? this.msg : "unknown")
        ]
        return ret.join("\n");
    }
}

// Parsing

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

// GENERATORS

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

// UNARY PREOPERATORS



exports.Parser = Parser;