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
        
        var bracketCount = 0;
        var dataTree = {data: [], parent: null};
        var current = dataTree;

        // Continue while the statement is not closed via ';'. 
        //All brackets must be closed, otherwise ';' will be interpreted as a string.
        while (ctx.parser.tokenizer.nextIgnoreWhitespacesAndComments()) {
            if (ctx.parser.parseJtexCommand(buffer, ctx))
                continue;
            if (ctx.parser.tokenizer.current.id == Tokens.PARENTHESIS_OPEN) {
                bracketCount++;
                var subTree = {data: [], parent: current};
                current.data.push(subTree);
                current = subTree;
            } else if (ctx.parser.tokenizer.current.id == Tokens.PARENTHESIS_CLOSED) {
                bracketCount--;
                current = current.parent;
            } else if (ctx.parser.tokenizer.current.id == Tokens.SEMICOLON && bracketCount == 0) {
                break;
            } else {
                current.data.push(ctx.parser.tokenizer.current);
            }
        }

        // Checks if all brackets have been closed
        // Otherwise, the parser cannot continue
        if (bracketCount != 0)
            throw new ParserError("Bracket error").init(this.tokenizer.current);

        // Wrap the whole tree to be able to use pUtils.parseMathTree without concatenating a token-list
        var wrapperTree = {data: [dataTree], parent: null};
        dataTree.parent = wrapperTree;

        // Traverse through tree-node elements to check for parseable objects
        var mtree = pUtils.parseMathTree(wrapperTree, true, this.binaryOperator)[0];

        // Write the LaTeX inline math-format to the line buffer
        buffer.append("$" + mtree.unwrap().toString() + "$");
    }
}

exports.JtexCommandMathInline = JtexCommandMathInline;