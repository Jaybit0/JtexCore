const TK_EOF = 0;
const TK_BACKSLASH = 1;
const TK_COMMENT = 2;
const TK_USE = 3;
const TK_VARNAME = 4;
const TK_ANY = 5;
const TK_EMPTY = 6;

export class Tokenizer {
    constructor(input) {
        this.state = new State(input);
        this.current = null;
    }

    next() {
        this.current = parseNext(this.state);
        return this.current.id != TK_EOF;
    }
}

export class Token {
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
        return new Token(TK_EOF).initFull(this.line, this.col, this.ptr, 0, null);
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
                this.col = 0
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
    while (state.ptr < state.input.length && (state.input[state.ptr] == " " || state.input[state.ptr] == "\t" || state.input[state.ptr] == "\n")) {
        state.incPtr();
    }
    if (state.ptr != state.beginPtr) {
        state.token = new Token(TK_ANY).init(state);
        return state.finalizeToken();
    }
    return null;
}

// UTILITY

function checkVarname(ch) {
    return (/[a-zA-Z]/).test(ch);
}

// STATES

function initialState(ch, state) {
    if (state.isEof())
        return state.eof();
    switch (ch) {
        case "\\":
            state.token = new Token(TK_BACKSLASH).init(state);
            state.incPtr();
            return false;
        case "%":
            state.setHandler(commentState);
            state.incPtr();
            return true;
        case "u":
            state.setHandler(uState);
            state.incPtr();
            return true;
    }
    if (checkVarname(ch)) {
        state.setHandler(varnameState);
        state.incPtr();
        return true;
    }
    // TODO: Any other token
}

function commentState(ch, state) {
    if (state.isEof())
        return state.eof();

    if (ch == "\n") {
        this.token = new Token(TK_COMMENT).init(state);
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
        state.token = new Token(TK_USE).init(state);
        return false;
    }
    state.setHandler(varnameState);
    state.incPtr();
    return true;
}

function varnameState(ch, state) {
    if (state.isEof() || !checkVarname(ch)) {
        state.token = new Token(TK_VARNAME).init(state);
        state.incPtr();
        return false;
    }
    state.incPtr();
    return true;
}