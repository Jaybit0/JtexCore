const {Tokens} = require("../../constants.js");
const {ParserError} = require("../../errors/parser_error.js");
const {JtexCommand} = require("../command.js");
const pUtils = require("../../utils/parser_utils.js");

class JtexCommandJs extends JtexCommand {
    constructor() {
        super("default.code.js", Tokens.VARNAME, tk => tk.data == "js" || tk.data == "javascript");
        this.init(this.parseJtexCodeJs);
    }

    parseJtexCodeJs(buffer, ctx) {
        if (!ctx.parser.tokenizer.nextIgnoreWhitespacesAndComments() || ctx.parser.tokenizer.current.id != Tokens.CURLY_BRACKET_OPEN)
            throw new ParserError("Expected curly bracket after command.").init(ctx.parser.tokenizer.current);
        
        // Overwrites the default parser to determine the end of the code
        var bracketCount = 1;
        var escapeChar = null;
        var escape = false;
        do {
            if (escape) {
                if (ctx.parser.tokenizer.state.input[ctx.parser.tokenizer.state.ptr] == escapeChar)
                    escape = false;
            } else {
                switch (ctx.parser.tokenizer.state.input[ctx.parser.tokenizer.state.ptr]) {
                    case '{':
                        bracketCount++;
                        break;
                    case '}':
                        bracketCount--;
                        break;
                    case '"':
                        escape = true;
                        escapeChar = '"';
                        break;
                    case "'":
                        escape = true;
                        escapeChar = "'";
                        break;
                }
            }
            ctx.parser.tokenizer.state.incPtr();
        } while (bracketCount > 0);
        var jsString = ctx.parser.tokenizer.state.data();
        jsString = jsString.substring(0, jsString.length-1);
        ctx.parser.tokenizer.state.setHandler(() => {});
        ctx.parser.tokenizer.state.finalizeToken();
        eval(jsString);
    }
}

function generate() {
    var cmds = [];
    cmds.push(new JtexCommandJs());
    return cmds;
}

exports.generate = generate;