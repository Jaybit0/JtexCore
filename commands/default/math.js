module.exports = function(env) {
    const path = require('path');
    const {Tokens} = require(path.join(env.base, "constants.js"));
    const {ParserError} = require(path.join(env.base, "errors", "parser_error.js"));
    const {JtexCommand} = require(path.join(env.base, "commands", "command.js"));
    const pUtils = require(path.join(env.base, "utils", "parser_utils.js"));
    const {Token, Tokenizer} = require(path.join(env.base, "tokenizer.js"));
    const {ParserTokens, ParserToken} = require(path.join(env.base, "parser_token.js"))
    const {Tuple} = require(path.join(env.base, "datastructures/Tuple.js"));
    const {TokenCollection} = require(path.join(env.base, "datastructures/TokenCollection.js"));

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
                        var dimX = this.#readNumericParameter(ctx, param.args.get(0).tokenize());
                        var dimY = this.#readNumericParameter(ctx, param.args.get(1).tokenize());
                        storedMatrix = new StoredMatrix();
                        storedMatrix.empty(dimX, dimY);
                        break;

                    case "set":
                        createMatrixFromData = false;
                        if (storedMatrix == null)
                            throw new ParserError("Cannot set at matrix coordinates. No matrix has been initialized.").init(param.param);
                        this.handleSetCommand(ctx, param, storedMatrix);
                        break;

                    case "fill":
                        createMatrixFromData = false;
                        if (storedMatrix == null)
                            throw new ParserError("Cannot fill any parameters. No matrix has been initialized.").init(param.param);
                        if (param.args.length() != 1 || param.args.get(0).tokenize().length == 0)
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
                        if (!(element instanceof Token) || !Tokenizer.isTokenWhitespaceOrComment(element)) {
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

            console.log(matrix);
            console.log(matrix[0]);
            console.log(matrix[0].constructor.name)
            for (var i = 0; i < matrix.length; i++)
                for (var j = 0; j < matrix[i].length; i++)
                    matrix[i][j] = new TokenCollection(matrix[i][j]);

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
                if (Tokenizer.isTokenWhitespaceOrComment(token))
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

        /**
         * Handles the set sub-command of the matrix
         * @param {ParserContex} ctx 
         * @param {*} param 
         * @param {StoredMatrix} storedMatrix 
         */
        handleSetCommand(ctx, param, storedMatrix) {
            // Check for annotation
            const [annotation, firstArg] = param.args.getAnnotated(0);

            var mdata = annotation == null ? "pos" : annotation.data;

            switch (mdata) {
                case "pos":
                case "position":
                case "loc":
                case "location":
                    this.handleSetPosition(ctx, param, storedMatrix);
                    break;
                case "row":
                    this.handleSetRowOrCol(ctx, param, storedMatrix, "row");
                    break;
                case "col":
                case "column":
                    this.handleSetRowOrCol(ctx, param, storedMatrix, "col");
                    break;
                default:
                    throw new ParserError("Could not resolve set command hint: " + mdata).init(annotation);
            }

            /*try {
                var x = this.#readNumericParameter(ctx, param.args.get(0).tokenize());
                var y = this.#readNumericParameter(ctx, param.args.get(1).tokenize());
                var data = param.args.get(2).tokenize();
                storedMatrix.set(x, y, data);
            } catch (e) {
                throw new ParserError("Could not parse matrix set-coordinates: " + e.message).init(param.args.get(0).tokenize());
            }*/
        }

        handleSetPosition(ctx, param, storedMatrix) {
            if (param.args.length() < 3)
                throw new ParserError("Could not set matrix entry at position. Expected 3 parameters, given: " + param.args.length()).init(param.param);

            var x = this.#readNumericParameter(ctx, param.args.getAnnotated(0)[1].tokenize());
            var y = this.#readNumericParameter(ctx, param.args.get(1).tokenize());
            var data = param.args.get(2).tokenize();
            storedMatrix.set(x, y, data);
        }

        handleSetRowOrCol(ctx, param, storedMatrix, mode) {
            if (param.args.length() < 2)
                throw new ParserError("Could not set matrix row at index. Expected 2 parameters, given: " + param.args.length()).init(param.param);

            var y = this.#readNumericParameter(ctx, param.args.getAnnotated(0)[1].tokenize());
            var row = param.args.get(1);
            
            var startIndex = pUtils.skipWhitespacesInTokenCollection(0, row);
            
            if (startIndex >= row.length())
                throw new ParserError("Could not set matrix row at index. Expected tuple, given: Empty").init(startIndex > 0 ? row.get(startIndex-1) : param.param);

            if (!(row.get(startIndex) instanceof Tuple))
                throw new ParserError("Cound not set matrix row at index. Expected tuple, given: " + row.get(startIndex).constructor.name).init(row.get(startIndex));

            var tpl = row.get(startIndex)
            this.parseVectorTuple(tpl);

            if (mode == "row")
                storedMatrix.setRow(y, tpl);
            else if (mode == "col")
                storedMatrix.setCol(y, tpl);
        }

        /**
         * Parses a vector tuple by adding metadata to meta entries that represent
         * certain actions
         * @param {Tuple} vec the vector tuple to parse
         */
        parseVectorTuple(vec) {
            for (var i = 0; i < vec.length(); i++) {
                const [annotation, entry] = vec.getAnnotated(i);

                if (annotation != null && annotation.data == "esc")
                    continue;

                if (this.checkForEmpty(entry))
                    entry.getMeta()["m.vec.skip"] = true;
            }
        }

        /**
         * Checks if the given token collection is empty or only contains whitespaces
         * @param {TokenCollection} col 
         * @returns {boolean} if the token collection is empty
         */
        checkForEmpty(col) {
            for (var i = 0; i < col.length(); i++) {
                if (col.get(i) instanceof Token && Tokenizer.isTokenWhitespaceOrComment(col.get(i)))
                    continue;
                return false;
            }
            return true;
        }
    }

    /**
     * The internal representation of a matrix
     */
    class StoredMatrix {
        constructor(data) {
            if (data == undefined)
                return;

            // Check if the matrix size is well defined
            // Each row should have the same number of entries
            if (data.length == 0)
                throw new ParserError("Cannot create an empty StoredMatrix!");
            
            this.data = data;
            const sizeY = this.data.length;
            const sizeX = this.data[0].length;

            for (var i = 1; i < sizeY; i++)
                if (this.data[i].length != sizeX)
                    throw new ParserError("The size of the matrix is inconsistent. Expected " + sizeX + ", given: " + this.data[i].length).init(this.data[i].length > 0 ? this.data[i][this.data[i].length-1] : null);

            this.data = data;
            this.sizeX = this.data.length[0];
            this.sizeY = this.data.length;
        }

        /**
         * 
         * @returns the size of the matrix as an array of length 2
         */
        size() {
            return [this.sizeX, this.sizeY];
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
                    /*var flattened = this.#unwrapAndFlattenTree(element);
                    if (flattened.length == 1)
                        flattened[0].unwrap();
                    parsedRow.push(flattened.join(""));*/
                    parsedRow.push(element.tokenize().join(""));
                }
                parsedComponents.push(parsedRow.join("&"));
            }

            return "\\begin{" + mmode + "}" + parsedComponents.join("\\\\") + "\\end{" + mmode + "}";
        }

        /**
         * Creates an empty array of the specified size
         * @param {int} dimX the number of columns
         * @param {int} dimY the number of rows
         */
        empty(dimX, dimY) {
            this.data = [];
            this.sizeX = dimX;
            this.sizeY = dimY;
            for (var i = 0; i < dimY; i++) {
                var row = [];
                for (var j = 0; j < dimX; j++)
                    row.push(new TokenCollection([]));
                this.data.push(row);
            }
        }

        // TODO: Init error with corresponding token (currently not possible)
        set(x, y, data) {
            if (x <= 0 || x >= this.sizeX)
                throw new ParserError("Trying to set an invalid x-position of the StoredMatrix: " + x + " (must be 0 <= x < " + this.sizeX + ")");

            if (y <= 0 || y >= this.sizeY)
                throw new ParserError("Trying to set an invalid y-position of the StoredMatrix: " + y + " (must be 0 <= y < " + this.sizeY + ")");

            this.data[y][x] = data;
        }

        /**
         * 
         * @param {int} y the row index
         * @param {Tuple} vector the vector
         */
        setRow(y, vector) {
            if (y < 0 || y >= this.sizeY)
                throw new ParserError("Invalid y coordinate! Expected 0 <= y < " + this.sizeY + ", given: y=" + y);
            if (vector.length() != this.sizeX)
                throw new ParserError("Invalid vector size! Expected " + this.sizeX + " entries, given: " + vector.length());
            
            for (var i = 0; i < this.sizeX; i++) {
                if (!vector.getAnnotated(i)[1].getProperty("m.vec.skip", false))
                    this.data[y][i] = vector.getAnnotated(i)[1];
            }
        }

        /**
         * 
         * @param {int} x the col index
         * @param {Tuple} vector the vector
         */
        setCol(x, vector) {
            if (x < 0 || x >= this.sizeX)
                throw new ParserError("Invalid x coordinate! Expected 0 <= x < " + this.sizeX + ", given: x=" + x);
            if (vector.length() != this.sizeY)
                throw new ParserError("Invalid vector size! Expected " + this.sizeY + " entries, given: " + vector.length());
            
            for (var i = 0; i < this.sizeY; i++) {
                if (!vector.getAnnotated(i)[1].getProperty("m.vec.skip", false))
                    this.data[i][x] = vector.getAnnotated(i)[1];
            }
        }

        /**
         * Fills all empty entries with the token specified.
         * Currently only works with empty matrices
         * @param {Array} fill 
         */
        fill(fill) {
            for (var row of this.data) {
                for (var i = 0; i < row.length; i++) {
                    if (row[i].data.length == 0)
                        row[i] = new TokenCollection(fill);
                }
            }
        }

        /**
         * Sets a block matrix at the specified coordinates
         * @param {int} x the column index
         * @param {int} y the row index
         * @param {StoredMatrix} matrix the matrix that should be written in
         */
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
