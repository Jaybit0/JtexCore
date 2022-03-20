const {Tokens, ParserTokens} = require("./constants.js");

class ParserToken {
    constructor(id) {
        this.id = id;
        this.wraps = 0;
    }

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
            default:
                this.id = ParserTokens.STRING;
                return this;
        }
    }

    withData(data) {
        this.data = data;
        return this;
    }

    at(beginToken, endToken) {
        this.beginToken = beginToken;
        this.endToken = endToken;
        return this;
    }

    wrap() {
        this.wraps++;
        return this;
    }

    unwrap() {
        this.wraps = this.wraps == 0 ? 0 : this.wraps-1;
        return this;
    }

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