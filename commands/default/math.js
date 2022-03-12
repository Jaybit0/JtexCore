const {Tokens} = require("../../constants.js");
const {ParserError} = require("../../errors/parser_error.js");
const {JtexCommand} = require("../command.js");
const pUtils = require("../../util/parser_utils.js");

class JtexCommandMathInline extends JtexCommand {
    constructor() {
        super("default.math.inline", Tokens.WHITESPACE, tk => true, parseJtexMathInline);
    }
}

function parseJtexMathInline(buffer, ctx) {
    if (ctx.ctx.filter(cmd => cmd == "default.math.inline").length > 1)
        throw new ParserError("Cannot run default.math.inline within another default.math.inline command").init(ctx.parser.tokenizer.current);
    var bracketCount = 0;
    var dataTree = {data: [], parent: null};
    var current = dataTree;
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
    if (bracketCount != 0)
        throw new ParserError("Bracket error").init(this.tokenizer.current);
    // Traverse through tree-node elements to check for parseable objects
    var wrapperTree = {data: [dataTree], parent: null};
    dataTree.parent = wrapperTree;
    var mtree = pUtils.parseMathTree(wrapperTree, true)[0];
    buffer.append("$" + mtree.unwrap().toString() + "$");
}

exports.JtexCommandMathInline = JtexCommandMathInline;