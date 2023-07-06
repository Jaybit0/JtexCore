module.exports = function(env) {
    const path = require('path');
    const {Tokens} = require(path.join(env.base, "constants.js"));
    const {ParserError} = require(path.join(env.base, "errors", "parser_error.js"));
    const {JtexCommand} = require(path.join(env.base, "commands", "command.js"));
    const pUtils = require(path.join(env.base, "utils", "parser_utils.js"));
    const {Token} = require(path.join(env.base, "tokenizer.js"));
    const {ParserTokens, ParserToken} = require(path.join(env.base, "parser_token.js"))

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
                parsedComponents.push(pUtils.parseMathTree(wrapperTree, true, this.binaryOperator, this.unaryOperator, this.singleOperator)[0]);
            }
            var mode = params.getParam("mode");
            var mmode = "align*";
            if (mode != null)
                mmode = pUtils.stringify(mode.args.get(0).tokenize());
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

            var hide = false;
            var createMatrixFromData = true;
            var store = [];

            var storedMatrix = null;

            for (var param of params.params) {
                switch(param.param.data) {
                    case "store":
                        try {
                            store.push(this.#readVarnameParameter(ctx, param.args.get(0).tokenize()));
                        } catch (e) {
                            throw new ParserError("Could not parse matrix store-variable: " + e.message).init(param.args.get(0).tokenize());
                        }
                        break;

                    case "recall":
                        createMatrixFromData = false;
                        storedMatrix = ctx.vars["matrices"][this.#readVarnameParameter(ctx, param.args.get(0).tokenize())];
                        break;

                    case "empty":
                        createMatrixFromData = false;
                        try {
                            var dimX = this.#readNumericParameter(ctx, param.args.get(0).tokenize());
                            var dimY = this.#readNumericParameter(ctx, param.args.get(1).tokenize());
                            storedMatrix = new StoredMatrix();
                            storedMatrix.empty(dimX, dimY);
                        } catch (e) {
                            throw new ParserError("Could not parse matrix dimensions: " + e.message).init(param.args.get(0).tokenize());
                        }
                        break;

                    case "set":
                        createMatrixFromData = false;
                        if (storedMatrix == null)
                            throw new ParserError("Cannot set at matrix coordinates. No matrix has been initialized.").init(param.param);
                        try {
                            var x = this.#readNumericParameter(ctx, param.args.get(0).tokenize());
                            var y = this.#readNumericParameter(ctx, param.args.get(1).tokenize());
                            var data = param.args.get(2).tokenize();
                            storedMatrix.set(x, y, data);
                        } catch (e) {
                            throw new ParserError("Could not parse matrix set-coordinates: " + e.message).init(param.args.get(0).tokenize());
                        }
                        break;

                    case "fill":
                        createMatrixFromData = false;
                        if (storedMatrix == null)
                            throw new ParserError("Cannot fill any parameters. No matrix has been initialized.").init(param.param);
                        if (param.args.length != 1 || param.args.get(0).tokenize().length == 0)
                            throw new ParserError("Expected one parameter for fill. Given: 0").init(param.param);
                        // TODO: Handle nested expressions -> Maybe stringify the whole parameter and parse it again
                        storedMatrix.fill(param.args.get(0).tokenize());
                        break;

                    case "hide":
                        hide = true;
                        break;

                    case "setblock":
                        createMatrixFromData = false;
                        if (storedMatrix == null)
                            throw new ParserError("Cannot set block. No matrix has been initialized.").init(param.param);
                        try {
                            var x = this.#readNumericParameter(ctx, param.args.get(0).tokenize());
                            var y = this.#readNumericParameter(ctx, param.args.get(1).tokenize());
                            var matrix = ctx.vars["matrices"][this.#readVarnameParameter(ctx, param.args.get(2).tokenize())];
                            storedMatrix.setblock(x, y, matrix);
                        } catch (e) {
                            throw new ParserError("Could not parse matrix setblock-coordinates: " + e.message).init(param.args.get(0).tokenize());
                        }
                        break;

                    default:
                        throw new ParserError("Unknown matrix parameter: " + param.param.data).init(param.param);
                }
            }
            if (createMatrixFromData)
                storedMatrix = this.createMatrixFromData(buffer, ctx);

            for (var tostore of store) {
                var varname = pUtils.stringify(tostore);
                if (ctx.vars["matrices"] == null)
                    ctx.vars["matrices"] = {}
                ctx.vars["matrices"][varname] = storedMatrix;
            }

            var recalled = storedMatrix.recall(this.getMode(params, args));

            if (!hide)
                buffer.append(recalled);
        }

        /**
         * Creates a StoredMatrix from the given data
         * @param {LineBuffer} buffer the line buffer
         * @param {ParserContext} ctx the parser context
         * @returns {StoredMatrix} the matrix
         */
        createMatrixFromData(buffer, ctx) {
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

            for (var token of dataTree.data) {
                if (token instanceof Token) {
                    if (token.id == Tokens.WHITESPACE && token.countLinebreaks() > 0) {
                        matrix[matrix.length-1].push(curElement);
                        matrix.push([]);
                        curElement = [];
                    }

                    if (token.id == Tokens.SEMICOLON) {
                        matrix[matrix.length-1].push(curElement);
                        matrix.push([]);
                        curElement = [];
                    } else if (token.id == Tokens.COMMA) {
                        matrix[matrix.length-1].push(curElement);
                        curElement = [];
                    } else {
                        curElement.push(token);
                    }
                } else {
                    curElement.push(token);
                }  
            }

            if (curElement.length != 0)
                matrix[matrix.length-1].push(curElement);

            if (matrix[matrix.length-1].length == 0)
                matrix.pop();

            // Smart remove empty rows
            var emptyRows = [];
            for (var i = 0; i < matrix.length; i++) {
                var row = matrix[i];
                var empty = false;

                if (row.length == 0)
                    empty = true;
                else if (row.length == 1) {
                    empty = true;
                    for (var element of row[0]) {
                        if (!(element instanceof Token) || !ctx.parser.tokenizer.isTokenWhitespaceOrComment(element)) {
                            empty = false;
                            break;
                        }
                    }
                }
                
                if (empty)
                    emptyRows.push(i);
            }
            
            for (var i = emptyRows.length-1; i >= 0; i--)
                matrix.splice(emptyRows[i], 1);

            return new StoredMatrix(matrix);
        }

        /**
         * Gets the matrix mode
         * @param {string[]} params the command parameters
         * @param {string[]} args the command arguments
         * @returns {string} the matrix mode
         */
        getMode(params, args) {
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
                mmode = pUtils.stringify(mode.args.get(0).tokenize());
            return mmode;
        }

        /**
         * Gets the leftmost token of the data tree
         * @param {*} treeData the data tree
         * @returns the leftmost token of the tree
         */
        leftmostToken(treeData) {
            while (!(treeData instanceof Token))
                treeData = treeData.data[0];
                
            return treeData;
        }

        /**
         * Reads a numeric parameter from a given argument
         * @param {ParserContext} ctx 
         * @param {object[]} arg 
         * @returns 
         */
        #readNumericParameter(ctx, arg) {
            var number = null;
            for (var token of arg) {
                if (!(token instanceof Token))
                    throw new ParserError("Expected a number. Cannot handle nested expressions here").init(token);
                if (ctx.parser.tokenizer.isTokenWhitespaceOrComment(token))
                    continue;
                if (number != null)
                    throw new ParserError("Expected a number. Given another token after the number has been initialized: " + token.data).init(token);

                if (token.id != Tokens.NUMBER)
                    throw new ParserError("Expected a number as matrix dimension. Given: " + token.data).init(token);

                number = Number(token.data);
            }

            if (number == null)
                throw new ParserError("Expected a number. Given empty parameter.").init(param.args.get(0).tokenize());

            return number;
        }

        /**
         * Reads a variable name parameter from a given argument
         * @param {ParserContext} ctx 
         * @param {object[]} arg 
         * @returns 
         */
        #readVarnameParameter(ctx, arg) {
            var varname = null;
            for (var token of arg) {
                if (!(token instanceof Token))
                    throw new ParserError("Expected a variable name. Cannot handle nested expressions here").init(token);
                if (ctx.parser.tokenizer.isTokenWhitespaceOrComment(token))
                    continue;
                if (varname != null)
                    throw new ParserError("Expected a variable name. Given another token after the variable name has been initialized: " + token.data).init(token);

                if (token.id != Tokens.VARNAME)
                    throw new ParserError("Expected a variable name as matrix dimension. Given: " + token.data).init(token);

                varname = token.data;
            }

            if (varname == null)
                throw new ParserError("Expected a variable name. Given empty parameter.").init(param.args.get(0).tokenize());

            return varname;
        }
    }

    /**
     * The internal representation of a matrix
     */
    class StoredMatrix {
        constructor(data) {
            this.data = data;
        }

        /**
         * Recalls a matrix as a string
         * @param {string} mmode the matrix mode put in \begin{mode} ... \end{mode}
         * @returns 
         */
        recall(mmode) {
            var parsedComponents = [];

            for (var row of this.data) {
                var parsedRow = [];
                for (var element of row) {
                    var flattened = this.#unwrapAndFlattenTree(element);
                    if (flattened.length == 1)
                        flattened[0].unwrap();
                    parsedRow.push(flattened.join(""));
                }
                parsedComponents.push(parsedRow.join("&"));
            }

            return "\\begin{" + mmode + "}" + parsedComponents.join("\\\\") + "\\end{" + mmode + "}";
        }

        empty(dimX, dimY) {
            this.data = [];
            for (var i = 0; i < dimY; i++) {
                var row = [];
                for (var j = 0; j < dimX; j++)
                    row.push([]);
                this.data.push(row);
            }
        }

        set(x, y, data) {
            this.data[y][x] = data;
        }

        fill(fillToken) {
            for (var row of this.data) {
                for (var i = 0; i < row.length; i++) {
                    if (row[i].length == 0)
                        row[i] = fillToken;
                }
            }
        }

        setblock(x, y, matrix) {
            for (var i = 0; i < matrix.data.length; i++) {
                for (var j = 0; j < matrix.data[i].length; j++) {
                    this.data[y+i][x+j] = matrix.data[i][j];
                }
            }
        }

        /**
         * TODO: Allow other JTeX-Commands
         * Unwraps and flattens the bracket tree.
         * 
         * @param {*} tree 
         * @param {int} layers 
         * @returns a list of parser tokens
         */
        #unwrapAndFlattenTree(tree, layers=1) {
            if (tree instanceof Token)
                return [tree];

            var result = [];

            for (var token of tree) {
                if (token instanceof Token)
                    result.push(new ParserToken(-1).fromLexerToken(token));
                else {
                    var flattened = this.#unwrapAndFlattenTree(token.data, layers-1);
                    var tk = new ParserToken(ParserTokens.STRING).withData(flattened.join("")).at(flattened[0].beginToken, flattened[flattened.length-1].endToken).noLeftRight().wrap();
                    result.push(tk);
                }
            }

            if (layers > 0 && result.length == 1)
                result[0].unwrap();

            return result;
        }
    }

    return [new JtexCommandMathInline(), new JtexCommandMathBlock(), new JtexCommandMatrix()];
}
