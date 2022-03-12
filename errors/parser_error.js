class ParserError extends Error {
    constructor(msg) {
        super(msg);
        this.msg = msg;
        this.token = null;
    }

    init(token) {
        this.token = token;
        return this;
    }

    toString() {
        var ret = [
            "A parser error occured" + (this.token != null ? " (line: " + this.token.line + ", column: " + this.token.col + ")." : "."),
            "Reason: " + (this.msg != null ? this.msg : "unknown")
        ]
        return ret.join("\n");
    }
}

exports.ParserError = ParserError;