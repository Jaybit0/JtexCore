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

function generate() {
    dat = [];
    dat.push(new JtexCommandMathInline());
    return dat;
}

exports.generate = generate;