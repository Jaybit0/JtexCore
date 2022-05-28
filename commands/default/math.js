module.exports = function(env) {
    const path = require('path');
    const {Tokens} = require(path.join(env.base, "constants.js"));
    const {ParserError} = require(path.join(env.base, "errors", "parser_error.js"));
    const {JtexCommand} = require(path.join(env.base, "commands", "command.js"));
    const pUtils = require(path.join(env.base, "utils", "parser_utils.js"));

    class JtexCommandMathInline extends JtexCommand {
        constructor() {
            super("default.math.inline", Tokens.WHITESPACE, tk => true);
            this.init(this.parseJtexMathInline);
        }

        /**
         * Parses the Jtex-command default.math.inline
         * @param {LineBuffer} buffer a line buffer
         * @param {ParserContext} ctx the parser context
         */
        parseJtexMathInline(buffer, ctx, args) {
            var allowedBrackets = {};
            allowedBrackets[Tokens.PARENTHESIS_OPEN] = Tokens.PARENTHESIS_CLOSED;
            var dataTree = pUtils.buildBracketTree(buffer, ctx, tk => tk.id == Tokens.SEMICOLON, true, allowedBrackets);

            // Wrap the whole tree to be able to use pUtils.parseMathTree without concatenating a token-list
            var wrapperTree = {data: [dataTree], parent: null};
            dataTree.parent = wrapperTree;

            var mtree = pUtils.parseMathTree(wrapperTree, true, this.binaryOperator, this.unaryOperator, this.singleOperator)[0];

            // Write the LaTeX inline math-format to the line buffer
            buffer.append("$" + mtree.unwrap().toString() + "$");
        }
    }

    class JtexCommandMathBlock extends JtexCommand {
        constructor() {
            super("default.math.block", Tokens.VARNAME, tk => tk.data == "math" || tk.data == "m");
            this.init(this.parseJtexMathBlock);
        }

        /**
         * Parses the Jtex-command default.math.block
         * @param {LineBuffer} buffer a line buffer
         * @param {ParserContext} ctx the parser context
         * @param {ParameterList} params a list of optional parameters
         */
        parseJtexMathBlock(buffer, ctx, params) {
            var allowedBrackets = {};
            allowedBrackets[Tokens.PARENTHESIS_OPEN] = Tokens.PARENTHESIS_CLOSED;
            if (!ctx.parser.tokenizer.nextIgnoreWhitespacesAndComments() || ctx.parser.tokenizer.current.id != Tokens.CURLY_BRACKET_OPEN)
                throw new ParserError("Expected curly bracket after command.").init(ctx.parser.tokenizer.current);
            var ctr = 0;
            var checker = tk => {
                if (tk.id == Tokens.CURLY_BRACKET_OPEN)
                    ctr++;
                else if (tk.id == Tokens.CURLY_BRACKET_CLOSED)
                    ctr--;
                if (ctr < 0)
                    return true;
                return false;
            };
            var dataTree = pUtils.buildBracketTree(buffer, ctx, checker, true, allowedBrackets);

            var mathComponents = [[]];
            for (var token of dataTree.data) {
                if (token.id == Tokens.SEMICOLON)
                    mathComponents.push([]);
                else
                    mathComponents[mathComponents.length-1].push(token);
            }

            var parsedComponents = [];
            for (var component of mathComponents) {
                var dataTree = {
                    data: component,
                    parent: null
                };
                var wrapperTree = {data: [dataTree], parent: null};
                dataTree.parent = wrapperTree;
                parsedComponents.push(pUtils.parseMathTree(wrapperTree, true, this.binaryOperator, this.unaryOperator, this.singleOperator)[0]);
            }
            var mode = params.getParam("mode");
            var mmode = "align*";
            if (mode != null)
                mmode = pUtils.stringify(mode.args[0]);
            buffer.append("\\begin{" + mmode + "}" + parsedComponents.map(cmp => cmp.unwrap()).join("\\\\") + "\\end{" + mmode +"}");
        }
    }

    return [new JtexCommandMathInline(), new JtexCommandMathBlock()];
}
