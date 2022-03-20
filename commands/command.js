const {OperatorType} = require("../operators/operator.js");

class JtexCommand {
    /**
     * 
     * @param { [int] } token_id the id of the command-token after '--'
     * @param { [function(ParserToken): boolean] } checker a checker function to determine if the token represents the command
     * @param { [function(LineBuffer, ParserToken, Parser): void] } handler a handler function to convert the command to a string
     */
    constructor(name, token_id, checker) {
        this.name = name;
        this.token_id = token_id;
        this.checker = checker;
        this.binaryOperators = [];
        this.unaryOperators = [];
        this.singleOperators = [];
        this.binaryOperator = null;
        this.unaryOperator = null;
        this.singleOperator = null;
    }

    init(handler) {
        this.handler = handler;
        return this;
    }

    injectOperator(operator) {
        switch (operator.type) {
            case OperatorType.BINARY_OPERATOR:
                this.binaryOperators.push(operator);
                break;
            case OperatorType.SINGLE_OPERATOR:
                this.singleOperators.push(operator);
                break;
            case OperatorType.UNARY_OPERATOR:
                this.unaryOperators.push(operator);
                break;
        }
    }

    buildOperators() {
        this.binaryOperator = this.buildBinaryOperators();
        this.singleOperator = this.buildSingleOperators();
    }

    buildBinaryOperators() {
        var dict = {};
        for (var op of this.binaryOperators) {
            dict[op.tokenId] = op.handler;
        }
        return (parse_tree, parse_stack, ptr) => {
            if (ptr == 0 || parse_tree.length <= ptr)
                return false;
            if (!(parse_tree[ptr].id in dict))
                return false;
            var op1 = parse_stack.pop();
            var op2 = parse_tree[ptr+1];
            var result = dict[parse_tree[ptr].id](op1, op2);
            if (result != null) {
                parse_stack.push(result);
                return true;
            }
            return false;
        };
    }

    buildSingleOperators() {
        var dict = {};
        for (var op of this.singleOperators) {
            dict[op.tokenId] = op.handler;
        }
        return (parse_tree, parse_stack, ptr) => {
            if (parse_tree.length < ptr)
                return false;
            if (!(parse_tree[ptr].id in dict))
                return false;
            var result = dict[parse_tree[ptr].id]();
            if (result != null) {
                parse_stack.push(result);
                return true;
            }
            return false;
        }
    }
}

exports.JtexCommand = JtexCommand;