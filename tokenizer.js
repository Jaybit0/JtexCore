const { Tokens } = require("./constants.js");

class Tokenizer {
  /**
   *
   * @param {string} input the input Jtex-string
   */
  constructor(input) {
    this.state = new State(input);
    this.current = null;
    this.tokenBuffer = [];
    this.tokenBufferActive = false;
    this.tokenQueue = [];
  }

  /**
   * Sets activates / deactivates the token-buffer.
   * @param {boolean} active
   */
  activateTokenBuffer(active) {
    this.tokenBufferActive = active;
  }

  /**
   *
   * @returns {boolean} whether the token-buffer is currently active
   */
  isTokenBufferActive() {
    return this.tokenBufferActive;
  }

  /**
   * Reads the next token from the input.
   * @returns {boolean} whether the next token is not EOF
   */
  next() {
    if (this.tokenQueue.length != 0) {
      this.current = this.tokenQueue.shift();
      if (this.tokenBufferActive && this.current.id != Tokens.EOF)
        this.tokenBuffer.push(this.current);
      return this.current.id != Tokens.EOF;
    }
    this.current = parseNext(this.state);
    if (this.tokenBufferActive && this.current.id != Tokens.EOF)
      this.tokenBuffer.push(this.current);
    return this.current.id != Tokens.EOF;
  }

  /**
   * Adds a token to the token-queue.
   * next() preferrably reads tokens from this FIFO-queue.
   * @param {Token} token
   */
  queueToken(token) {
    this.tokenQueue.push(token);
  }

  /**
   * Adds multiple tokens to the token-queue.
   * @param {Token[]} tokens
   */
  queueTokens(tokens) {
    this.tokenQueue.push(...tokens);
  }

  /**
   * Moves to the next token that isn't a whitespace.
   * @returns whether the next token is not EOF
   */
  nextIgnoreWhitespacesAndComments() {
    while (this.next() && this.currentTokenWhitespaceOrComment()) continue;
    return this.current.id != Tokens.EOF;
  }

  /**
   *
   * @returns whether the next Token is a Whitespace, Comment or Block_Comment
   */
  currentTokenWhitespaceOrComment() {
    return (
      this.current.id == Tokens.WHITESPACE ||
      this.current.id == Tokens.COMMENT ||
      this.current.id == Tokens.BLOCK_COMMENT
    );
  }

  /**
   * Converts the token-buffer to a string.
   * @param {int} cut the last n tokens that should not appear in the string
   * @param {function(Token): boolean} filter a function which decides whether a token should be converted to a string
   * @returns {string} the resulting string
   */
  resolveTokenBuffer(cut = 0, filter = (x) => true) {
    var ret = this.tokenBuffer;
    this.tokenBuffer = [];
    if (cut != 0) ret = ret.slice(0, ret.length - cut);
    var filtered = ret.filter(filter).map((cur) => cur.toString());
    if (filtered.length == 0) return "";
    return filtered.reduce((prev, cur) => prev + cur);
  }

  /**
   * Pushes a token to the token-buffer.
   * @param {Token} token
   */
  pushToTokenBuffer(token) {
    this.tokenBuffer.push(token);
  }
}

class Token {
  /**
   *
   * @param {int} id the id of the token
   */
  constructor(id) {
    this.id = id;
  }

  /**
   * Initializes the token with a state.
   * This automatically fills in information based on the current state.
   * @param {State} state the current state
   * @returns this instance
   */
  init(state) {
    this.line = state.beginLine;
    this.col = state.beginCol;
    this.idx = state.beginPtr;
    this.len = state.len();
    this.data = state.data();
    return this;
  }

  /**
   * Manually initializes the token.
   * @param {int} line the line of the token
   * @param {int} col the column of the token
   * @param {int} idx the start-index of the token
   * @param {int} len the length of the token
   * @param {string} data the data string of the token
   * @returns this instance
   */
  initFull(line, col, idx, len, data) {
    this.line = line;
    this.col = col;
    this.idx = idx;
    this.len = len;
    this.data = data;
    return this;
  }

  /**
   * Initializes the token based on another token.
   * @param {Token} token the referenced token
   * @returns this instance
   */
  initFrom(token) {
    this.line = token.line;
    this.col = token.col;
    this.idx = token.col;
    return this;
  }

  /**
   * Sets the data of the token.
   * @param {string} data the data string
   * @returns this instance
   */
  withData(data) {
    this.len = data.length;
    this.data = data;
    return this;
  }

  /**
   * Converts the token to a representative string.
   * @returns the converted token-string
   */
  toString() {
    switch (this.id) {
      case Tokens.BLOCK_COMMENT:
        // Add a newline after the comment to prevent the current line to be commented in LaTeX
        return "%" + this.data.replaceAll("\n", "\n%") + "\r\n";
      default:
        return this.data;
    }
  }
}

class State {
  /**
   *
   * @param {string} input
   */
  constructor(input) {
    this.input = input;
    this.beginPtr = 0;
    this.ptr = 0;
    this.line = 1;
    this.beginLine = 0;
    this.col = 0;
    this.beginCol = 0;
    this.token = null;
  }

  /**
   * Sets the next state-handler.
   * @param {function(string, State): boolean} handler a function that returns whether the token has a next state
   */
  setHandler(handler) {
    this.handler = handler;
  }

  /**
   * Progresses to the next state
   * @returns whether the token has a next state
   */
  nextState() {
    return this.handler(this.input[this.ptr], this);
  }

  /**
   * Finalizes the current token and clears all buffers.
   * @returns the token
   */
  finalizeToken() {
    if (this.token == null) this.handler(null, this);
    var tk = this.token;
    this.token = null;
    this.handler = null;
    this.beginPtr = this.ptr;
    this.beginCol = this.col;
    this.beginLine = this.line;
    return tk;
  }

  /**
   *
   * @returns whether the current token is EOF
   */
  isEof() {
    return this.ptr >= this.input.length;
  }

  /**
   *
   * @returns a new EOF-token
   */
  eof() {
    return new Token(Tokens.EOF).initFull(
      this.line,
      this.col,
      this.ptr,
      0,
      null
    );
  }

  /**
   *
   * @returns the length of the current token
   */
  len() {
    return this.ptr - this.beginPtr;
  }

  /**
   *
   * @returns the data of the current state buffer
   */
  data() {
    return this.input.substring(this.beginPtr, this.ptr);
  }

  /**
   * Increments the data pointer to progress to the next character.
   */
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

/**
 * Parses the next token.
 * @param {State} state the current state
 * @returns whether the next token is not EOF
 */
function parseNext(state) {
  if (state.isEof()) return state.eof();
  var wspaces = skipWhitespaces(state);

  if (wspaces != null) return wspaces;

  state.setHandler(initialState);

  while (state.nextState()) continue;

  return state.finalizeToken();
}

/**
 * Skips any next whitespaces and converts them to a whitespace token if existing.
 * @param {State} state the current state
 * @returns the whitespace token, null if no whitespaces are next
 */
function skipWhitespaces(state) {
  while (
    state.ptr < state.input.length &&
    checkWhitespace(state.input[state.ptr])
  ) {
    state.incPtr();
  }
  if (state.ptr != state.beginPtr) {
    state.token = new Token(Tokens.WHITESPACE).init(state);
    return state.finalizeToken();
  }
  return null;
}

// UTILITY

/**
 *
 * @param {string} ch the character to check
 * @returns whether the character is a whitespace
 */
function checkWhitespace(ch) {
  return ch == " " || ch == "\t" || ch == "\r" || ch == "\n";
}

/**
 *
 * @param {string} ch the character to check
 * @returns whether the character is an allowed symbol in the varname
 */
function checkVarname(ch, start = false) {
  if (start) return /[a-zA-Z]/.test(ch);
  return /[a-zA-Z0-9]/.test(ch);
}

function checkNumber(ch) {
  return /[0-9]/.test(ch);
}

/**
 *
 * @param {string} ch the character to check
 * @returns whether the character is an allowed symbol in the LaTeX-varname
 */
function checkProgressingLatexVarname(ch) {
  return /[a-zA-Z0-9]/.test(ch);
}

// STATES

function initialState(ch, state) {
  if (state.isEof()) return state.eof();
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
    case "*":
      state.incPtr();
      state.token = new Token(Tokens.STAR).init(state);
      return false;
    case "^":
      state.incPtr();
      state.token = new Token(Tokens.ROOF).init(state);
      return false;
    case "=":
      state.incPtr();
      state.setHandler(equalsState);
      return true;
    case "<":
      state.incPtr();
      state.setHandler(lessThanState);
      return true;
    case "_":
      state.incPtr();
      state.token = new Token(Tokens.UNDERSCORE).init(state);
      return false;
    case ".":
      state.incPtr();
      state.setHandler(dotState);
      return true;
    case ":":
      state.incPtr();
      state.setHandler(colonState);
      return true;
    case "°":
      state.incPtr();
      state.token = new Token(Tokens.CIRCLE).init(state);
      return false;
  }
  if (checkNumber(ch)) {
    state.incPtr();
    state.setHandler(numberState);
    return true;
  }
  if (checkVarname(ch, true)) {
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
  if (state.isEof() || !checkProgressingLatexVarname(ch)) {
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
  if (state.isEof()) return varnameState(ch, state);
  switch (ch) {
    case "s":
      state.setHandler(usState);
      state.incPtr();
      return true;
    default:
      state.setHandler(varnameState);
      return true;
  }
}

function usState(ch, state) {
  if (state.isEof()) return varnameState(ch, state);
  switch (ch) {
    case "e":
      state.setHandler(useState);
      state.incPtr();
      return true;
    default:
      state.setHandler(varnameState);
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

function numberState(ch, state) {
  if (state.isEof() || !checkNumber(ch)) {
    state.token = new Token(Tokens.NUMBER).init(state);
    return false;
  }
  state.incPtr();
  return true;
}

function dashState(ch, state) {
  if (state.isEof() || ch != "-") {
    state.token = new Token(Tokens.DASH).init(state);
    return false;
  }
  state.incPtr();
  state.token = new Token(Tokens.DOUBLE_DASH).init(state);
  return false;
}

function slashState(ch, state) {
  if (state.isEof() || (ch != "*" && ch != "/")) {
    state.token = new Token(Tokens.SLASH).init(state);
    return false;
  }
  if (ch == "/") {
    state.incPtr();
    state.setHandler(doubleSlashState);
    return true;
  }
  state.incPtr();
  state.setHandler(blockCommentState);
  return true;
}

function doubleSlashState(ch, state) {
  if (state.isEof() || (ch != "*" && ch != "/")) {
    state.token = new Token(Tokens.DOUBLE_SLASH).init(state);
    return false;
  }
  if (ch == "/") {
    state.token = new Token(Tokens.DOUBLE_SLASH).init(state);
    return false;
  }
  if (ch == "*") {
    state.token = new Token(Tokens.SLASH).init(state);
    state.token.data = state.token.data.substr(1);
    state.ptr -= 1;
    return false;
  }
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

function equalsState(ch, state) {
  if (!state.isEof() && ch == ">") {
    state.incPtr();
    state.token = new Token(Tokens.EQUALS_GREATER_THAN).init(state);
    return false;
  }
  if (!state.isEof() && ch == ":") {
    state.incPtr();
    state.token = new Token(Tokens.EQUALS_COLON).init(state);
    return false;
  }
  state.token = new Token(Tokens.EQUALS).init(state);
  return false;
}

function lessThanState(ch, state) {
  if (state.isEof() || ch != "=") {
    state.token = new Token(Tokens.ANY).init(state);
    return false;
  }
  state.incPtr();
  state.setHandler(lessThanEqualsState);
  return true;
}

function lessThanEqualsState(ch, state) {
  if (state.isEof() || ch != ">") {
    state.token = new Token(Tokens.LESS_THAN_EQUALS).init(state);
    return false;
  }
  state.incPtr();
  state.token = new Token(Tokens.LESS_THAN_EQUALS_GREATER_THAN).init(state);
  return false;
}

function dotState(ch, state) {
  if (state.isEof() || ch != ".") {
    state.token = new Token(Tokens.DOT).init(state);
    return false;
  }
  state.incPtr();
  state.setHandler(doubleDotState);
  return true;
}

function doubleDotState(ch, state) {
  if (state.isEof() || ch != ".") {
    this.ptr--;
    this.col--;
    state.token = new Token(Tokens.DOT).init(state);
    return false;
  }
  state.incPtr();
  state.token = new Token(Tokens.TRIPLE_DOT).init(state);
  return false;
}

function colonState(ch, state) {
  if (!state.isEof() && ch == "=") {
    state.incPtr();
    state.token = new Token(Tokens.COLON_EQUALS).init(state);
    return false;
  }
  state.token = new Token(Tokens.COLON).init(state);
  return false;
}

// EXPORTS

exports.Token = Token;
exports.Tokenizer = Tokenizer;
