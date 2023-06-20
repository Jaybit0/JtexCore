module.exports = function(env) {
    const path = require('path');
    const {Tokens} = require(path.join(env.base, "constants.js"));
    const {ParserError} = require(path.join(env.base, "errors", "parser_error.js"));
    const {JtexCommand} = require(path.join(env.base, "commands", "command.js"));
    const pUtils = require(path.join(env.base, "utils", "parser_utils.js"));
    const {Token} = require(path.join(env.base, "tokenizer.js"));

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
        parseJtexMathInline(buffer, ctx, params, args) {
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
        parseJtexMathBlock(buffer, ctx, params, args) {
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
                console.log("MathWrapper: ", wrapperTree.data[0]);
                parsedComponents.push(pUtils.parseMathTree(wrapperTree, true, this.binaryOperator, this.unaryOperator, this.singleOperator)[0]);
            }
            var mode = params.getParam("mode");
            var mmode = "align*";
            if (mode != null)
                mmode = pUtils.stringify(mode.args[0]);
            buffer.append("\\begin{" + mmode + "}" + parsedComponents.map(cmp => cmp.unwrap()).join("\\\\") + "\\end{" + mmode +"}");
        }
    }

    class JtexCommandMatrix extends JtexCommand {
        constructor() {
            super("default.math.matrix", Tokens.VARNAME, tk => tk.data == "mat" || tk.data == "pmat" || tk.data == "bmat"
                || tk.data == "plmat" || tk.data == "Bmat" || tk.data == "vmat" || tk.data == "Vmat");
            this.init(this.parseMatrix);
        }

        parseMatrix(buffer, ctx, params, args) {
            if (ctx.countContextOccurrences(mctx => mctx === "default.math.inline" || mctx === "default.math.block") == 0)
                throw new ParserError("Cannot use matrix command outside a math environment.").init(args.commandToken);

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
            var matrix = [[]];
            var curElement = [];

            var mathComponents = [[]];
            var line_tracker = -1;
            console.log(dataTree)
            for (var token of dataTree.data) {
                if (line_tracker == -1)
                    line_tracker = this.leftmostToken(token).line;
                else if (line_tracker != this.leftmostToken(token).line) {
                    mathComponents.push([]);
                    matrix[matrix.length-1].push(curElement);
                    matrix.push([]);
                    curElement = [];
                    line_tracker = token.line;
                }
                if (token.id == Tokens.SEMICOLON) {
                    mathComponents.push([]);
                    matrix[matrix.length-1].push(curElement);
                    matrix.push([]);
                    curElement = [];
                } else if (token.id == Tokens.COMMA) {
                    mathComponents[mathComponents.length-1].push(new Token(Tokens.ANY).initFrom(token).withData("&"));
                    matrix[matrix.length-1].push(curElement);
                    curElement = [];
                } else {
                    mathComponents[mathComponents.length-1].push(token);
                    curElement.push(token);
                }
            }

            if (matrix[matrix.length-1].length == 0)
                matrix.pop();

            var parsedComponents = [];
            for (var component of mathComponents) {
                var dataTree = {
                    data: component,
                    parent: null
                };
                var wrapperTree = {data: [dataTree], parent: null};
                dataTree.parent = wrapperTree;
                console.log("WRAPPER: ", wrapperTree.data[0])
                parsedComponents.push(pUtils.parseMathTree(wrapperTree, true, this.binaryOperator, this.unaryOperator, this.singleOperator)[0]);
            }
            var mode = params.getParam("mode");

            var cmd = args.commandToken;
            var mmode = "pmatrix";

            switch (cmd.data) {
                case "mat":
                    break;
                case "pmat":
                    break;
                case "bmat":
                    mmode = "bmatrix";
                    break;
                case "plmat":
                    mmode = "matrix";
                    break;
                case "Bmat":
                    mmode = "Bmatrix";
                    break;
                case "vmat":
                    mmode = "vmatrix";
                    break;
                case "Vmat":
                    mmode = "Vmatrix";
                    break;
                default:
                    throw new ParserError("Could not identify matrix mode: " + cmd.data).init(cmd);
            }

            if (mode != null)
                mmode = pUtils.stringify(mode.args[0]);

            var store = params.getParam("store");
            if (store != null) {
                var varname = pUtils.stringify(store.args[0]);
                if (ctx.vars["matrices"] == null)
                    ctx.vars["matrices"] = {}
                ctx.vars["matrices"][varname] = new StoredMatrix(matrix);

                console.log(ctx.vars["matrices"][varname].recall(mmode, this.binaryOperator, this.unaryOperator, this.singleOperator));
            }
            console.log("ACTUAL: " + "\\begin{" + mmode + "}" + parsedComponents.map(cmp => cmp.unwrap()).join("\\\\") + "\\end{" + mmode +"}")
            if (params.getParam("hide") == null)
                buffer.append("\\begin{" + mmode + "}" + parsedComponents.map(cmp => cmp.unwrap()).join("\\\\") + "\\end{" + mmode +"}");
        }

        leftmostToken(treeData) {
            while (treeData instanceof Token)
                treeData = treeData.data[0];
                
            return treeData;
        }
    }

    class StoredMatrix {
        constructor(data) {
            this.data = data;
        }

        recall(mmode, binaryOperator, unaryOperator, singleOperator) {
            // TODO: Recall mathComponents
            //console.log("DAT: ", this.data[1][0])
            //console.log(this.data[2])

            var parsedComponents = [];

            for (var row of this.data) {
                var parsedRow = [];
                for (var element of row) {
                    var dataTree = {
                        data: element,
                        parent: null
                    };
                    var wrapperTree = {data: [dataTree], parent: null};
                    dataTree.parent = wrapperTree;
                    parsedRow.push(pUtils.parseMathTree(wrapperTree, true, binaryOperator, unaryOperator, singleOperator)[0]);
                }
                parsedComponents.push(parsedRow.map(cmp => cmp.unwrap()).join("&"));
            }

            return "\\begin{" + mmode + "}" + parsedComponents.join("\\\\") + "\\end{" + mmode + "}";
        }
    }

    return [new JtexCommandMathInline(), new JtexCommandMathBlock(), new JtexCommandMatrix()];
}
