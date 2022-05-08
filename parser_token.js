const {Tokens, ParserTokens} = require("./constants.js");

class ParserToken {
    /**
     * 
     * @param {int} id the token-id 
     */
    constructor(id) {
        this.id = id;
        this.wraps = 0;
    }

    /**
     * Automatically initializes the parser-token from a lexer-token.
     * @param {Token} token the lexer-token
     * @returns this instance
     */
    fromLexerToken(token) {
        this.withData(token.data).at(token, token);
        switch (token.id) {
            case Tokens.SLASH:
                this.id = ParserTokens.FRACTION;
                return this;
            case Tokens.STAR:
                this.id = ParserTokens.MULTIPLY;
                return this;
            case Tokens.ROOF:
                this.id = ParserTokens.POWER;
                return this;
            case Tokens.DOUBLE_SLASH:
                this.id = ParserTokens.INTEGRAL;
                return this;
            case Tokens.EQUALS_GREATER_THAN:
                this.id = ParserTokens.IMPLIES;
                return this;
            case Tokens.LESS_THAN_EQUALS:
                this.id = ParserTokens.IMPLIED_BY;
                return this;
            case Tokens.LESS_THAN_EQUALS_GREATER_THAN:
                this.id = ParserTokens.IFF;
                return this;
            case Tokens.UNDERSCORE:
                this.id = ParserTokens.SUBSCRIPT;
                return this;
            case Tokens.TRIPLE_DOT:
                this.id = ParserTokens.TRIPLE_DOT;
                return this;
            case Tokens.COLON:
                this.id = ParserTokens.COLON;
                return this;
            case Tokens.COLON_EQUALS:
                this.id = ParserTokens.COLON_EQUALS;
                return this;
            case Tokens.EQUALS_COLON:
                this.id = ParserTokens.EQUALS_COLON;
                return this;
            default:
                this.id = ParserTokens.STRING;
                return this;
        }
    }

    /**
     * Sets the data of the token
     * @param {string} data 
     * @returns this instance
     */
    withData(data) {
        this.data = data;
        return this;
    }

    /**
     * Sets a range of tokens to accurately keep track of the token location and size in the actual input-file
     * @param {Token} beginToken the beginning lexer-token
     * @param {Token} endToken the ending lexer-token
     * @returns this instance
     */
    at(beginToken, endToken) {
        this.beginToken = beginToken;
        this.endToken = endToken;
        return this;
    }

    /**
     * Wraps the token in parenthesis
     * @returns this instance
     */
    wrap() {
        this.wraps++;
        return this;
    }

    /**
     * Unwraps one layer of parentheses if available
     * @returns this instance
     */
    unwrap() {
        this.wraps = this.wraps == 0 ? 0 : this.wraps-1;
        return this;
    }

    /**
     * Converts the token to a string with respect to the parentheses
     * @returns the token as a string
     */
    toString() {
        var before = "";
        var after = "";
        for (var i = 0; i < this.wraps; i++) {
            before += "\\left(";
            after += "\\right)";
        }
        return before + this.data + after;
    }
}

exports.ParserToken = ParserToken;
exports.ParserTokens = ParserTokens;