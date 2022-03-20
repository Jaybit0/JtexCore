const OperatorType = {
    BINARY_OPERATOR: 1,
    UNARY_OPERATOR: 2,
    SINGLE_OPERATOR: 3
}

class Operator {
    /**
     * 
     * @param {int} type the operator type (binary/unary/single)
     * @param {int} tokenId the Id of the corresponding token
     * @param {function(ParserToken, ParserToken): ParserToken} handler the handler-function
     */
    constructor(type, tokenId, handler) {
        this.type = type;
        this.tokenId = tokenId;
        this.commands = [];
        this.handler = handler;
    }

    /**
     * Declares the intent of injecting the operator to a certain command.
     * The actual injection will be handled by the parser.
     * @param  {...string} str the command-name
     * @returns this instance
     */
    injectToCommand(...str) {
        this.commands.push(...str);
        return this;
    }
}

exports.OperatorType = OperatorType;
exports.Operator = Operator;