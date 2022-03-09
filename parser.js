const {Tokenizer, Tokens, Token} = require("./tokenizer.js");

class Parser {
    constructor(tokenizer) {
        this.tokenizer = tokenizer;
    }

    parse() {
        var out = []
        this.parseUse(out);
        this.tokenizer.popLineBuffer();
        this.parseMain(out);
        return out.join("\n");
    }

    parseUse(out) {
        var managedImports = [];
        if (!this.tokenizer.nextIgnoreWhitespacesAndComments())
            return;
        while (this.parseUseExpr(managedImports))
            continue;
        for (var mImport of managedImports) {
            if (mImport.comments.length != 0)
                out.push(...mImport.comments);
            out.push("\\usepackage{" + mImport.package + "}");
        }
    }

    parseUseExpr(managedImports) {
        if (this.tokenizer.current.id != Tokens.USE)
            return false;
        if (!this.tokenizer.nextIgnoreWhitespacesAndComments())
            return false;
        if (this.tokenizer.current.id != Tokens.VARNAME)
            throw new ParserError("A package name was expected. Given: " + this.tokenizer.current.data);
        var mImport = {
            package: this.tokenizer.current.data,
            comments: this.tokenizer.popComments()
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

    parseMain(out) {
        while (this.tokenizer.nextIgnoreWhitespacesAndComments()) {
            if (this.tokenizer.current.id == Tokens.DOUBLE_DASH) {
                out.push(...this.tokenizer.popLineBuffer());
                out[out.length-1] = out[out.length-1].substr(0, out[out.length-1].length-2);
                this.parseJtexCommand(out);
            }
        }
        out.push(...this.tokenizer.popLineBuffer());
    }

    parseJtexCommand(out) {

    }
}

class SyntaxElement {
    constructor(handler, params) {

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

exports.Parser = Parser;