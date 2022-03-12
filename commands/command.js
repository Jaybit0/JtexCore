class JtexCommand {
    /**
     * 
     * @param { [int] } token_id the id of the command-token after '--'
     * @param { [function(ParserToken): boolean] } checker a checker function to determine if the token represents the command
     * @param { [function(LineBuffer, ParserToken, Parser): void] } handler a handler function to convert the command to a string
     */
    constructor(name, token_id, checker, handler) {
        this.name = name;
        this.token_id = token_id;
        this.checker = checker;
        this.handler = handler;
    }
}

exports.JtexCommand = JtexCommand;