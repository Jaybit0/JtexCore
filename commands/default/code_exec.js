const {Tokens} = require("../../constants.js");
const {ParserError} = require("../../errors/parser_error.js");
const {JtexCommand} = require("../command.js");
const pUtils = require("../../utils/parser_utils.js");
const fUtils = require("../../utils/file_utils.js")

class JtexCommandJs extends JtexCommand {
    constructor() {
        super("default.code.js", Tokens.VARNAME, tk => tk.data == "js" || tk.data == "javascript");
        this.init(this.parseJtexCodeJs);
        this.scope = {
            "ref": this
        };
        this.loadDefaultFunctions();
    }

    loadDefaultFunctions() {
        for (var f of fUtils.getFiles("./code_exec_functions")) {
            try {
                for (var [key, val] of Object.entries(require("..\\..\\" + f).generate()))
                    this.scope[key] = val;
            } catch (err) {
                console.error("Could not load default functions from file:", f);
                console.error(err);
            }
        }
    }

    parseJtexCodeJs(buffer, ctx) {
        if (!ctx.parser.tokenizer.nextIgnoreWhitespacesAndComments() || ctx.parser.tokenizer.current.id != Tokens.CURLY_BRACKET_OPEN)
            throw new ParserError("Expected curly bracket after command.").init(ctx.parser.tokenizer.current);
        var refToken = ctx.parser.tokenizer.current;
        
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
        var dat = "";
        var mScope = Object.assign({}, this.scope);
        mScope["ctx"] = {
            "cRef": this,
            "buffer": buffer,
            "ctx": ctx,
            "cRefToken": refToken
        };
        for (var key of Object.keys(mScope)) {
            if (key != "ref" && key != "ctx")
                dat += "const " + key + "=this."+key+".bind(this.ctx);";
        }
        dat += "for (var member in this) delete this[member];";
        mScope.ctx.buffer = buffer;
        (function() { 
            return eval('"use strict";' + dat + jsString); 
        }).call(mScope);
    }
}

function generate() {
    var cmds = [];
    cmds.push(new JtexCommandJs());
    return cmds;
}

exports.generate = generate;