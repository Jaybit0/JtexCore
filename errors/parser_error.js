class ParserError extends Error {
    constructor(msg) {
        super(msg);
        this.msg = msg;
        this.token = null;
    }

    /**
     * Initializes the error at a certain token. This is useful to 
     * give detailed information about the error location in the input-file.
     * @param {Token} token the token at which the error occured 
     * @returns 
     */
    init(token) {
        this.token = token;
        return this;
    }

    /**
     * 
     * @returns the error as a string
     */
    toString() {
        var ret = [
            "A parser error occured" + (this.token != null ? " (line: " + this.token.line + ", column: " + this.token.col + ")." : "."),
            "Reason: " + (this.msg != null ? this.msg : "unknown")
        ]
        return ret.join("\n");
    }
}

exports.ParserError = ParserError;