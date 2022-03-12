const {Tokenizer, Tokens, Token, LineBuffer, splitLinebreaks} = require("./tokenizer.js");
const {ParserTokens, ParserToken} = require("./parser_tokens.js");
const {ParserError} = require("./errors/parser_error.js");
const {JtexCommand} = require("./commands/command.js");
const {JtexCommandMathInline} = require("./commands/default/math.js");
const pUtils = require("./util/parser_utils.js");

class Parser {
    constructor(tokenizer) {
        this.tokenizer = tokenizer;
        this.commandList = {};
        this.initDefaultCommands();
    }

    initDefaultCommands() {
        this.initJtexCommand(new JtexCommandMathInline());
    }

    /**
     * 
     * @param { [JtexCommand] } command the Jtex-command
     */
    initJtexCommand(command) {
        if (!(command.token_id in this.commandList))
            this.commandList[command.token_id] = [];
        this.commandList[command.token_id].push(command);
    }

    removeJtexCommand(name) {
        for (var [key, val] of this.commandList.entries())
            this.commandList[key] = val.filter(cmd => cmd.name == name);
    }

    parse(lineBreak = "\r\n") {
        var buffer = new LineBuffer();
        this.tokenizer.activateTokenBuffer(true);
        this.parseUse(buffer);
        this.tokenizer.activateTokenBuffer(true);
        //this.tokenizer.pushToTokenBuffer(new Token(Tokens.WHITESPACE).initFull(-1, -1, -1, 2, lineBreak + lineBreak));
        //this.tokenizer.pushToTokenBuffer(this.tokenizer.current);
        this.parseMain(buffer);
        return buffer.toString(lineBreak);
    }

    parseUse(buffer) {
        var managedImports = [];
        if (!this.tokenizer.nextIgnoreWhitespacesAndComments())
            return;
        while (this.parseUseExpr(managedImports))
            continue;
        console.log("Buffer:", buffer);
        console.log("ManagedImports:", managedImports);
        for (var mImport of managedImports) {
            if (mImport.comments.length != 1)
                buffer.appendMany(mImport.comments);
            buffer.appendNewLine("\\usepackage{" + mImport.package + "}");
        }
        console.log("Buffer:", buffer);
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
            comments: splitLinebreaks(this.tokenizer.resolveTokenBuffer(0, x => (x.id == Tokens.COMMENT || x.id == Tokens.BLOCK_COMMENT)))
        };
        managedImports.push(mImport);
        while (this.tokenizer.nextIgnoreWhitespacesAndComments()) {
            if (this.tokenizer.current.id != Tokens.COMMA)
                break;
            if (!this.tokenizer.nextIgnoreWhitespacesAndComments())
                return false;
            mImport = {
                package: this.tokenizer.current.data,
                comments: splitLinebreaks(this.tokenizer.resolveTokenBuffer(0, x => (x.id == Tokens.COMMENT || x.id == Tokens.BLOCK_COMMENT)))
            };
            managedImports.push(mImport);
        }
        return true;
    }

    parseMain(buffer) {
        while (this.tokenizer.nextIgnoreWhitespacesAndComments()) {
            if (this.tokenizer.current.id == Tokens.DOUBLE_DASH) {
                var res = this.tokenizer.resolveTokenBuffer(1);
                var lb = splitLinebreaks(res);
                buffer.appendMany(lb);
                var bufferActive = this.tokenizer.isTokenBufferActive();
                this.tokenizer.activateTokenBuffer(false);
                this.parseJtexCommand(buffer);
                this.tokenizer.activateTokenBuffer(bufferActive);
            }
        }
        buffer.appendMany(splitLinebreaks(this.tokenizer.resolveTokenBuffer()));
    }

    parseJtexCommand(buffer, ctx = new ParserContext(this)) {
        if (!this.tokenizer.next())
            throw new ParserError("A jtex-command was expected. Given: " + this.tokenizer.current.data).init(this.tokenizer.current);
        if (this.tokenizer.current.id in this.commandList) {
            for (var cmd of this.commandList[this.tokenizer.current.id]) {
                if (!cmd.checker(this.tokenizer.current))
                    continue;
                ctx.push(cmd.name);
                if (ctx.ctx.length == 1) {
                    cmd.handler(buffer, ctx);
                } else {
                    var mBuffer = new LineBuffer();
                    cmd.handler(mBuffer, ctx);
                    var tokens = pUtils.tokenizeSubstring(mBuffer.toString(), this.tokenizer.current);
                    this.tokenizer.queueTokens(tokens);
                }
                ctx.pop();
                return true;
            }
        }
        // TODO: interpret token as string
        return false;
    }
}

class ParserContext {
    constructor(parser, ctx = []) {
        this.parser = parser;
        this.ctx = ctx;
    }

    push(ctx) {
        this.ctx.push(ctx);
    }

    pop(ctx) {
        return this.ctx.pop(ctx);
    }
}

exports.Parser = Parser;
exports.ParserContext = ParserContext;