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
            throw new ParserError("A package name was expected. Given: " + this.tokenizer.current.data).init(this.tokenizer.current);
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
        if (!this.tokenizer.next())
            throw new ParserError("A jtex-command was expected. Given: " + this.tokenizer.current.data).init(this.tokenizer.current);
        switch(this.tokenizer.current.id) {
            case Tokens.WHITESPACE:
                this.parseJtexMathInline(out);
                break;
            default:
                throw new ParserError("?").init(this.tokenizer.current);
        }
    }

    parseJtexMathInline(out) {
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
        console.log(dataTree.data)
        // TODO
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