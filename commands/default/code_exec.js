const {Tokens} = require("../../constants.js");
const {ParserError} = require("../../errors/parser_error.js");
const {JtexCommand} = require("../command.js");
const fUtils = require("../../utils/file_utils.js")

class JtexCommandJs extends JtexCommand {
    constructor() {
        super("default.code.js", Tokens.VARNAME, tk => tk.data == "js" || tk.data == "javascript");
        this.init(this.parseJtexCodeJs);
        this.scope = {
            "ref": this,
            "vars": {}
        };
        this.loadDefaultFunctions();
    }

    /**
     * Dynamically loads all functions from files located in
     * './code_exec_functions/'.
     */
    loadDefaultFunctions() {
        for (var f of fUtils.getFiles("./code_exec_functions")) {
            try {
                for (var [key, val] of Object.entries(require(f).generate()))
                    this.scope[key] = val;
            } catch (err) {
                console.error("Could not load default functions from file:", f);
                console.error(err);
            }
        }
    }

    /**
     * Parses the javascript code-block.
     * @param {LineBuffer} buffer a line buffer
     * @param {ParserContext} ctx the parser context
     */
    parseJtexCodeJs(buffer, ctx) {
        if (!ctx.parser.tokenizer.nextIgnoreWhitespacesAndComments() || ctx.parser.tokenizer.current.id != Tokens.CURLY_BRACKET_OPEN)
            throw new ParserError("Expected curly bracket after command.").init(ctx.parser.tokenizer.current);
        var refToken = ctx.parser.tokenizer.current;
        
        // Overwrites the default parser to determine the end of the code
        // Loads the string until the outer bracket pair '{...}' has been closed
        // Ignores string types as they are not recognized as a bracket in javascript
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

        // Retrieves the string from the overwritten tokenizer
        var jsString = ctx.parser.tokenizer.state.data();
        jsString = jsString.substring(0, jsString.length-1);

        // Resets the tokenizer to a valid state
        ctx.parser.tokenizer.state.setHandler(() => {});
        ctx.parser.tokenizer.state.finalizeToken();

        // Creates the scope for the code to be executed
        var mScope = Object.assign({}, this.scope);
        mScope["ctx"] = {
            "cRef": this,
            "buffer": buffer,
            "ctx": ctx,
            "cRefToken": refToken
        };

        // Sets up the code that should be run before the actual user-input
        // This should simplify the workflow by binding all functions to the right context
        // Thus, it isn't necessary to provide the context manually on function calls like 'write', ...
        var dat = "";
        for (var key of Object.keys(mScope)) {
            if (key == "ref" || key == "ctx")
                continue;
            if (typeof mScope[key] === "function") {
                if (key != "ref" && key != "ctx")
                    dat += "const " + key + "=this."+key+".bind(this.ctx);";
            } else {
                dat += "const " + key + "=this." + key + ";";
            }
        }
        dat += "for (var member in this) delete this[member];";

        // Sets the buffer and the varstore that can be used to define variables across
        // multiple javascript-blocks
        mScope.ctx.buffer = buffer;
        mScope.ctx.vars = this.varStore;

        // Runs all code from a string
        // Uses a more ore less isolated environment to allow the use of any local variables
        // The function is called in the scope 'mScope' which can be accessed using 'this'
        // The return-value of the function will currently be ignored
        (function() { 
            return eval('"use strict";' + dat + jsString); 
        }).call(mScope);
    }
}

/**
 * Generates all commands implemented in this file.
 * This function is required for the command_loader to recognize the module and should not be called manually.
 * @returns the list of commands
 */
function generate() {
    var cmds = [];
    cmds.push(new JtexCommandJs());
    return cmds;
}

exports.generate = generate;