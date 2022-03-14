const OperatorType = {
    BINARY_OPERATOR: 1,
    UNARY_OPERATOR: 2,
    SINGLE_OPERATOR: 3
}

class Operator {
    constructor(type, tokenId, handler) {
        this.type = type;
        this.tokenId = tokenId;
        this.commands = [];
        this.handler = handler;
    }

    injectToCommand(...str) {
        this.commands.push(...str);
        return this;
    }
}

exports.OperatorType = OperatorType;
exports.Operator = Operator;