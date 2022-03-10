const {Tokenizer, Tokens, Token} = require("./tokenizer.js");

const ParserTokens = {
    STRING: 0,
    FRACTION: 1,
    MULTIPLY: 2
};

class ParserToken {
    constructor(id) {
        this.id = id;
        this.wraps = 0;
    }

    fromLexerToken(token) {
        switch (token.id) {
            case Tokens.SLASH:
                this.id = ParserTokens.FRACTION;
                this.withData(token.data).at(token, token);
                return this;
            case Tokens.STAR:
                this.id = ParserTokens.MULTIPLY;
                this.withData(token.data).at(token, token);
                return this;
            default:
                this.id = ParserTokens.STRING;
                this.withData(token.data).at(token, token);
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
            before += "(";
            after += ")";
        }
        return before + this.data + after;
    }
}

exports.ParserToken = ParserToken;
exports.ParserTokens = ParserTokens;