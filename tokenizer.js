const { stat } = require("fs");

const Tokens = {
    EOF: 0,
    BACKSLASH: 1,
    COMMENT: 2,
    USE: 3,
    VARNAME: 4,
    ANY: 5,
    EMPTY: 6,
    PARENTHESIS_OPEN: 7,
    PARENTHESIS_CLOSED: 8,
    CURLY_BRACKET_OPEN: 9,
    CURLY_BRACKET_CLOSED: 10,
    SQUARE_BRACKET_OPEN: 11,
    SQUARE_BRACKET_CLOSED: 12,
    SEMICOLON: 13,
    DOUBLE_DASH: 14,
    COMMA: 15,
    WHITESPACE: 16,
    BLOCK_COMMENT: 17,
    LATEX_COMMAND: 18,
    SLASH: 19
};

class Tokenizer {
    constructor(input) {
        this.state = new State(input);
        this.current = null;
        this.commentBuffer = []
        this.lineBuffer = [];
    }

    next() {
        this.current = parseNext(this.state);
        return this.current.id != Tokens.EOF;
    }

    nextIgnoreWhitespacesAndComments() {
        while (this.next() && (this.current.id == Tokens.WHITESPACE || this.current.id == Tokens.COMMENT || this.current.id == Tokens.BLOCK_COMMENT)) {
            switch(this.current.id) {
                case Tokens.COMMENT:
                    this.commentBuffer.push(this.current.data);
                    this.lineBuffer.push(this.current.data);
                    break;
                case Tokens.BLOCK_COMMENT:
                    var mdat = this.splitLinebreaks(this.current.data);
                    for (var dat of mdat) {
                        this.commentBuffer.push("%" + dat);
                        this.lineBuffer.push("% " + dat);
                    }
                    break;
                default:
                    var dats = this.splitLinebreaks(this.current.data)
                    this.lineBuffer[this.lineBuffer.length-1] += dats[0]
                    for (var i = 1; i < dats.length; i++)
                        this.lineBuffer.push(dats[i]);
            }
        }
        if (this.current.id != Tokens.EOF)
            this.lineBuffer[this.lineBuffer.length - 1] += this.current.data;
        return this.current.id != Tokens.EOF;
    }

    popComments() {
        var ret = this.commentBuffer;
        this.commentBuffer = [];
        return ret;
    }

    popLineBuffer() {
        var ret = this.lineBuffer;
        this.lineBuffer = [];
        return ret;
    }

    splitLinebreaks(str) {
        var dats = str.split("\r\n");
        var out = [];
        for (var dat of dats) {
            var subsplit = dat.split("\n");
            out.push(...subsplit)
        }
        return out
    }
}

class Token {
    constructor(id) {
        this.id = id;
    }

    init(state) {
        this.line = state.beginLine;
        this.col = state.beginCol;
        this.idx = state.beginPtr;
        this.len = state.len();
        this.data = state.data();
        return this;
    }

    initFull(line, col, idx, len, data) {
        this.line = line;
        this.col = col;
        this.idx = idx;
        this.len = len;
        this.data = data;
        return this;
    }
}

class State {
    constructor(input) {
        this.input = input;
        this.beginPtr = 0;
        this.ptr = 0;
        this.line = 0;
        this.beginLine = 0;
        this.col = 0;
        this.beginCol = 0;
        this.token = null;
    }

    setHandler(handler) {
        this.handler = handler;
    }

    nextState() {
        return this.handler(this.input[this.ptr], this);
    }

    finalizeToken() {
        if (this.token == null)
            this.handler(null, this);
        var tk = this.token;
        this.token = null;
        this.handler = null;
        this.beginPtr = this.ptr;
        this.beginCol = this.col;
        this.beginLine = this.line;
        return tk;
    }

    isEof() {
        return this.ptr >= this.input.length;
    }

    eof() {
        return new Token(Tokens.EOF).initFull(this.line, this.col, this.ptr, 0, null);
    }

    len() {
        return this.ptr - this.beginPtr;
    }

    data() {
        return this.input.substr(this.beginPtr, this.len());
    }

    incPtr() {
        this.ptr++;
        if (this.ptr < this.input.length) {
            if (this.input[this.ptr] == "\n") {
                this.line++;
                this.col = 0;
            } else {
                this.col++;
            }
        }
    }
}

function parseNext(state) {
    if (state.isEof())
        return state.eof();
    var wspaces = skipWhitespaces(state);
    
    if (wspaces != null)
        return wspaces;

    state.setHandler(initialState);

    while (state.nextState())
        continue;
    
    return state.finalizeToken();
}

function skipWhitespaces(state) {
    while (state.ptr < state.input.length && checkWhitespace(state.input[state.ptr])) {
        state.incPtr();
    }
    if (state.ptr != state.beginPtr) {
        state.token = new Token(Tokens.WHITESPACE).init(state);
        return state.finalizeToken();
    }
    return null;
}

// UTILITY

function checkWhitespace(ch) {
    return ch == " " || ch == "\t" || ch == "\r" || ch == "\n";
}

function checkVarname(ch) {
    return (/[a-zA-Z]/).test(ch);
}

function checkProgressingLatexVarname(ch) {
    return (/[a-zA-Z0-9]/).test(ch);
}

function checkSingleLatexEscapeChars(ch) {
    return ch == "{" || ch == "}" || ch == "[" || ch == "]" || "_" || "^";
}

// STATES

function initialState(ch, state) {
    if (state.isEof())
        return state.eof();
    switch (ch) {
        case "\\":
            state.incPtr();
            state.setHandler(backslashState);
            return true;
        case "%":
            state.incPtr();
            state.setHandler(commentState);
            return true;
        case "(":
            state.incPtr();
            state.token = new Token(Tokens.PARENTHESIS_OPEN).init(state);
            return false;
        case ")":
            state.incPtr();
            state.token = new Token(Tokens.PARENTHESIS_CLOSED).init(state);
            return false;
        case "[":
            state.incPtr();
            state.token = new Token(Tokens.SQUARE_BRACKET_OPEN).init(state);
            return false;
        case "]":
            state.incPtr();
            state.token = new Token(Tokens.SQUARE_BRACKET_CLOSED).init(state);
            return false;
        case "{":
            state.incPtr();
            state.token = new Token(Tokens.CURLY_BRACKET_OPEN).init(state);
            return false;
        case "}":
            state.incPtr();
            state.token = new Token(Tokens.CURLY_BRACKET_CLOSED).init(state);
            return false;
        case ";":
            state.incPtr();
            state.token = new Token(Tokens.SEMICOLON).init(state);
            return false;
        case ",":
            state.incPtr();
            state.token = new Token(Tokens.COMMA).init(state);
            return false;
        case "-":
            state.incPtr();
            state.setHandler(dashState);
            return true;
        case "u":
            state.incPtr();
            state.setHandler(uState);
            return true;
        case "/":
            state.incPtr();
            state.setHandler(slashState);
            return true;
    }
    if (checkVarname(ch)) {
        state.incPtr();
        state.setHandler(varnameState);
        return true;
    }
    state.incPtr();
    state.token = new Token(Tokens.ANY).init(state);
    return false;
}

function backslashState(ch, state) {
    if (state.isEof() || checkWhitespace(ch)) {
        state.token = new Token(Tokens.BACKSLASH).init(state);
        return false;
    }
    state.setHandler(latexPreCommandState);
    return true;
}

function latexPreCommandState(ch, state) {
    if (!checkVarname(ch)) {
        state.incPtr();
        state.token = new Token(Tokens.LATEX_COMMAND).init(state);
        return false;
    }
    state.incPtr();
    state.setHandler(latexCommandState);
    return true;
}

function latexCommandState(ch, state) {
    if (!checkProgressingLatexVarname(ch)) {
        state.token = new Token(Tokens.LATEX_COMMAND).init(state);
        return false;
    }
    state.incPtr();
    return true;
}

function commentState(ch, state) {
    if (state.isEof()) {
        state.token = new Token(Tokens.COMMENT).init(state);
        return false;
    }

    if (ch == "\n") {
        this.token = new Token(Tokens.COMMENT).init(state);
        this.token.data = this.token.data.replace("\r", "");
        return false;
    }
    state.incPtr();
    return true;
}

function uState(ch, state) {
    if (state.isEof())
        return varnameState(ch, state);
    switch (ch) {
        case "s":
            state.setHandler(usState);
            state.incPtr();
            return true;
        default:
            state.setHandler(varnameState);
            state.incPtr();
            return true;
    }
}

function usState(ch, state) {
    if (state.isEof())
        return varnameState(ch, state);
    switch (ch) {
        case "e":
            state.setHandler(useState);
            state.incPtr();
            return true;
        default:
            state.setHandler(varnameState);
            state.incPtr();
            return true;
    }
}

function useState(ch, state) {
    if (state.isEof() || !checkVarname(ch)) {
        state.token = new Token(Tokens.USE).init(state);
        return false;
    }
    state.setHandler(varnameState);
    state.incPtr();
    return true;
}

function varnameState(ch, state) {
    if (state.isEof() || !checkVarname(ch)) {
        state.token = new Token(Tokens.VARNAME).init(state);
        return false;
    }
    state.incPtr();
    return true;
}

function dashState(ch, state) {
    if (state.isEof() || ch != "-") {
        state.token = new Token(Tokens.ANY).init(state);
        return false;
    }
    state.incPtr();
    state.token = new Token(Tokens.DOUBLE_DASH).init(state);
    return false;
}

function slashState(ch, state) {
    if (state.isEof() || ch != "*") {
        state.token = new Token(Tokens.SLASH).init(state);
        return false;
    }
    state.incPtr();
    state.setHandler(blockCommentState);
    return true;
}

function blockCommentState(ch, state) {
    if (state.isEof()) {
        state.token = new Token(Tokens.BLOCK_COMMENT).init(state);
        state.token.data = state.token.data.substr(2);
        return false;
    }
    state.incPtr();
    if (ch == "*") {
        state.setHandler(blockCommentClose1State);
        return true;
    }
    return true;
}

function blockCommentClose1State(ch, state) {
    if (state.isEof()) {
        state.token = new Token(Tokens.BLOCK_COMMENT).init(state);
        state.token.data = state.token.data.substr(2);
        return false;
    }
    state.incPtr();
    if (ch == "/") {
        state.token = new Token(Tokens.BLOCK_COMMENT).init(state);
        state.token.data = state.token.data.substr(2, state.token.data.length - 4);
        return false;
    }
    state.setHandler(blockCommentState);
    return true;
}

// EXPORTS

exports.Tokens = Tokens;
exports.Token = Token;
exports.Tokenizer = Tokenizer;