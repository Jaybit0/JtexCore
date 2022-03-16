const {Tokens} = require("../../constants.js");
const {ParserError} = require("../../errors/parser_error.js");
const {JtexCommand} = require("../command.js");
const pUtils = require("../../utils/parser_utils.js");

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
    parseJtexMathInline(buffer, ctx) {
        // Checks if the command is within another default.math.inline command. Could also be removed.
        if (ctx.ctx.filter(cmd => cmd == "default.math.inline").length > 1)
            throw new ParserError("Cannot run default.math.inline within another default.math.inline command").init(ctx.parser.tokenizer.current);
        
        var allowedBrackets = {};
        allowedBrackets[Tokens.PARENTHESIS_OPEN] = Tokens.PARENTHESIS_CLOSED;
        var dataTree = pUtils.buildBracketTree(buffer, ctx, tk => tk.id == Tokens.SEMICOLON, true, allowedBrackets);

        // Wrap the whole tree to be able to use pUtils.parseMathTree without concatenating a token-list
        var wrapperTree = {data: [dataTree], parent: null};
        dataTree.parent = wrapperTree;

        // Traverse through tree-node elements to check for parseable objects
        var mtree = pUtils.parseMathTree(wrapperTree, true, this.binaryOperator)[0];

        // Write the LaTeX inline math-format to the line buffer
        buffer.append("$" + mtree.unwrap().toString() + "$");
    }
}

class JtexCommandMathBlock extends JtexCommand {
    constructor() {
        super("default.math.block", Tokens.VARNAME, tk => tk.data == "math" || tk.data == "m");
        this.init(this.parseJtexMathBlock);
    }

    parseJtexMathBlock(buffer, ctx) {
        // Checks if the command is within another default.math.inline command. Could also be removed.
        if (ctx.ctx.filter(cmd => cmd == "default.math.inline").length > 1)
            throw new ParserError("Cannot run default.math.inline within another default.math.inline command").init(ctx.parser.tokenizer.current);

        
        var allowedBrackets = {};
        allowedBrackets[Tokens.PARENTHESIS_OPEN] = Tokens.PARENTHESIS_CLOSED;
        if (!ctx.parser.tokenizer.nextIgnoreWhitespacesAndComments() || ctx.parser.tokenizer.current.id != Tokens.CURLY_BRACKET_OPEN)
            throw new ParserError("Expected curly bracket after command.").init(ctx.parser.tokenizer.current);
        var dataTree = pUtils.buildBracketTree(buffer, ctx, tk => tk.id == Tokens.CURLY_BRACKET_CLOSED, true, allowedBrackets);

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
            parsedComponents.push(pUtils.parseMathTree(wrapperTree, true, this.binaryOperator)[0]);
        }
        buffer.append("\\begin{align}" + parsedComponents.map(cmp => cmp.unwrap()).join("\\\\") + "\\end{align}");
    }
}

function generate() {
    var dat = [];
    dat.push(new JtexCommandMathInline());
    dat.push(new JtexCommandMathBlock());
    return dat;
}

exports.generate = generate;