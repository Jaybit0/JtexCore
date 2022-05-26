module.exports = function(env) {
    const path = require('path');
    const {Tokens} = require(path.join(env.base, "constants.js"));
    const {ParserError} = require(path.join(env.base, "errors", "parser_error.js"));
    const {JtexCommand} = require(path.join(env.base, "commands", "command.js"));
    
    class JtexCommandUse extends JtexCommand {
        constructor() {
            super("default.use", Tokens.USE, tk => tk.data == "use");
            this.defaultPackages = ["amsmath"];
            this.init(this.parseJtexUse);
        }
    
        /**
         * Parses a Jtex-use command.
         * @param {LineBuffer} buffer a line buffer
         * @param {ParserContext} ctx the parser context
         * @param {ParameterList} params a list of optional parameters
         */
        parseJtexUse(buffer, ctx, params) {
            if (!ctx.parser.tokenizer.nextIgnoreWhitespacesAndComments())
                throw new ParserError("Expected a package-name after command.").init(ctx.parser.tokenizer.current);
            
            var optionals = "";
            console.log(params.getParams())
            for (var optional of params.getParams())
                optionals += "[" + optional.param.data + "]";
    
            var packages = [];
            for (var next = this.resolvePackageName(ctx); next != null; next = this.nextPackage(ctx)) {
                if (next == "default")
                    packages.push(...this.defaultPackages);
                else
                    packages.push(next);
            }
            buffer.appendNewLine("\\usepackage" + optionals + "{" + packages.join(", ") + "}");
        }
    
        /**
         * Resolves a package name from the following tokens.
         * @param {ParserContext} ctx the parser context 
         * @returns the current package-name
         */
        resolvePackageName(ctx) {
            if (ctx.parser.tokenizer.current.id != Tokens.VARNAME)
                throw new ParserError("Expected a package name.").init(ctx.parser.tokenizer.current);
            var packageName = ctx.parser.tokenizer.current.data;
            while (ctx.parser.tokenizer.next()
                && (ctx.parser.tokenizer.current.id == Tokens.VARNAME
                    || ctx.parser.tokenizer.current.id == Tokens.DASH)) {
                packageName += ctx.parser.tokenizer.current.data;
            }
            return packageName;
        }
    
        /**
         * Retrieves the next package from the tokenizer.
         * @param {ParserContext} ctx the parser-context 
         * @returns the next package-name if available, otherwise null
         */
        nextPackage(ctx) {
            if (ctx.parser.tokenizer.current.id == Tokens.WHITESPACE) {
                if (ctx.parser.tokenizer.current.data.includes("\n")) {
                    ctx.parser.tokenizer.queueToken(ctx.parser.tokenizer.current);
                    return null;
                } else if (ctx.parser.tokenizer.nextIgnoreWhitespacesAndComments()) {
                    return null;
                }
            }
            if (ctx.parser.tokenizer.current.id == Tokens.SEMICOLON)
                return null;
            if (ctx.parser.tokenizer.current.id != Tokens.COMMA) {
                ctx.parser.tokenizer.queueToken(ctx.parser.tokenizer.current);
                return null;
            }
            if (!ctx.parser.tokenizer.nextIgnoreWhitespacesAndComments())
                throw new ParserError("Expected another package name after comma.").init(ctx.parser.tokenizer.current);
            return this.resolvePackageName(ctx);
        }
    }
    
    return [new JtexCommandUse()];
}