const {Tokenizer} = require("./tokenizer.js");
const {Tokens} = require("./constants.js");
const {LineBuffer} = require("./utils/line_buffer.js");
const {ParserError} = require("./errors/parser_error.js");
const {JtexCommand} = require("./commands/command.js");
const {JtexCommandMathInline} = require("./commands/default/math.js");
const pUtils = require("./utils/parser_utils.js");
const stringUtils = require("./utils/string_utils.js");
const cmdLoader = require("./commands/command_loader.js");
const opLoader = require("./operators/operator_loader.js");

class Parser {
    /**
     * Creates a new parser instance from the given tokenizer.
     * @param {Tokenizer} tokenizer the corresponding tokenizer instance
     */
    constructor(tokenizer) {
        this.tokenizer = tokenizer;
        this.commandDict = {};
        this.commandList = [];
        this.#initDefaultCommands();
        this.injectOperators();
    }

    /**
     * Initializes all default Jtex-commands.
     */
    #initDefaultCommands() {
        var commands = cmdLoader.loadCommands();
        for (var cmd of commands)
            this.initJtexCommand(cmd); 
    }

    /**
     * Initializes a new Jtex-command. Additional commands can be registered here.
     * @param { [JtexCommand] } command the Jtex-command
     */
    initJtexCommand(command) {
        if (!(command.token_id in this.commandDict))
            this.commandDict[command.token_id] = [];
        this.commandDict[command.token_id].push(command);
        this.commandList.push(command);
    }

    /**
     * Removes all Jtex-commands with the given name. Mainly used to remove or overwrite default commands.
     * @param {string} name the name of the command
     */
    removeJtexCommand(name) {
        for (var [key, val] of this.commandList.entries())
            this.commandList[key] = val.filter(cmd => cmd.name != name);
        this.commandList = this.commandList.filter(cmd => cmd.name != name);
    }

    injectOperators() {
        var ops = opLoader.loadOperators();
        for (var cmd of this.commandList) {
            for (var op of ops) {
                if (op.commands.includes(cmd.name))
                    cmd.injectOperator(op);
            }
        }
        this.commandList.forEach(cmd => cmd.buildOperators());
    }

    /**
     * Parses the tokens from the Tokenizer instance to a LaTeX-string.
     * @param {string} lineBreak 
     * @returns {string} a string in LaTeX format
     */
    parse(lineBreak = "\r\n") {
        var buffer = new LineBuffer();
        this.tokenizer.activateTokenBuffer(true);
        this.parseUse(buffer);
        this.tokenizer.activateTokenBuffer(true);
        this.parseMain(buffer);
        return buffer.toString(lineBreak);
    }

    /**
     * Parses the use-header.
     * @param {LineBuffer} buffer a line buffer to write the output to 
     */
    parseUse(buffer) {
        var managedImports = [];
        if (!this.tokenizer.nextIgnoreWhitespacesAndComments())
            return;
        while (this.parseUseExpr(managedImports))
            continue;
        for (var mImport of managedImports) {
            if (mImport.comments.length != 1)
                buffer.appendMany(mImport.comments);
            buffer.appendNewLine("\\usepackage{" + mImport.package + "}");
        }
    }

    /**
     * 
     * @param {Array<Object>} managedImports 
     * @returns {boolean} whether the next use-expression could be parsed
     */
    parseUseExpr(managedImports) {
        if (this.tokenizer.current.id != Tokens.USE)
            return false;
        if (!this.tokenizer.nextIgnoreWhitespacesAndComments())
            return false;
        if (this.tokenizer.current.id != Tokens.VARNAME)
            throw new ParserError("A package name was expected. Given: " + this.tokenizer.current.data).init(this.tokenizer.current);
        var mImport = {
            package: this.tokenizer.current.data,
            comments: stringUtils.splitLinebreaks(this.tokenizer.resolveTokenBuffer(0, x => (x.id == Tokens.COMMENT || x.id == Tokens.BLOCK_COMMENT)))
        };
        managedImports.push(mImport);
        while (this.tokenizer.nextIgnoreWhitespacesAndComments()) {
            if (this.tokenizer.current.id != Tokens.COMMA)
                break;
            if (!this.tokenizer.nextIgnoreWhitespacesAndComments())
                return false;
            mImport = {
                package: this.tokenizer.current.data,
                comments: stringUtils.splitLinebreaks(this.tokenizer.resolveTokenBuffer(0, x => (x.id == Tokens.COMMENT || x.id == Tokens.BLOCK_COMMENT)))
            };
            managedImports.push(mImport);
        }
        return true;
    }

    /**
     * Parses the main body of the document.
     * @param {LineBuffer} buffer a LineBuffer 
     */
    parseMain(buffer) {
        while (this.tokenizer.nextIgnoreWhitespacesAndComments()) {
            if (this.tokenizer.current.id == Tokens.DOUBLE_DASH) {
                var res = this.tokenizer.resolveTokenBuffer(1);
                var lb = stringUtils.splitLinebreaks(res);
                buffer.appendMany(lb);
                var bufferActive = this.tokenizer.isTokenBufferActive();
                this.tokenizer.activateTokenBuffer(false);
                this.parseJtexCommand(buffer);
                this.tokenizer.activateTokenBuffer(bufferActive);
            }
        }
        buffer.appendMany(stringUtils.splitLinebreaks(this.tokenizer.resolveTokenBuffer()));
    }

    /**
     * Parses a Jtex-command.
     * @param {LineBuffer} buffer a line-buffer
     * @param {ParserContext} ctx the parser-context
     * @returns {boolean} whether there was a Jtex-command
     */
    parseJtexCommand(buffer, ctx = new ParserContext(this)) {
        if (this.tokenizer.current.id != Tokens.DOUBLE_DASH)
            return false;
        if (!this.tokenizer.next())
            throw new ParserError("A jtex-command was expected. Given: " + this.tokenizer.current.data).init(this.tokenizer.current);
        if (this.tokenizer.current.id in this.commandDict) {
            for (var cmd of this.commandDict[this.tokenizer.current.id]) {
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
        return true;
    }
}

class ParserContext {
    /**
     * Creates a new parser context.
     * @param {Parser} parser a parser
     * @param {Array<string>} ctx the command call-stack
     */
    constructor(parser, ctx = []) {
        this.parser = parser;
        this.ctx = ctx;
    }

    /**
     * Pushes a new command onto the command call-stack.
     * @param {string} ctx the command name
     */
    push(ctx) {
        this.ctx.push(ctx);
    }

    /**
     * Pops the last command from the command call-stack.
     * @param {string} ctx 
     * @returns {string} the popped command name
     */
    pop() {
        return this.ctx.pop();
    }
}

exports.Parser = Parser;
exports.ParserContext = ParserContext;