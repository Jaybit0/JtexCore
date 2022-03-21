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

    /**
     * Initializes the command with a given handler-function.
     * This function will be called when this command appears in the input-file.
     * @param {function(LineBuffer, ParserContext): void} handler 
     * @returns this instance
     */
    init(handler) {
        this.handler = handler;
        return this;
    }

    /**
     * Injects a new operator to the command.
     * Note that operators will only be handled if their support was implemented 
     * in the individual handler-function.
     * @param {Operator} operator the operator
     */
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

    /**
     * Builds all operators. When the operator-list changed, this function
     * should be called again.
     */
    buildOperators() {
        this.binaryOperator = this.buildBinaryOperators();
        this.singleOperator = this.buildSingleOperators();
    }

    /**
     * Builds the handler-function for binary operators.
     * @returns the operator-handler-function
     */
    buildBinaryOperators() {
        var dict = {};
        for (var op of this.binaryOperators) {
            if (op.tokenId in dict)
                dict[op.tokenId].push(op)
            else
                dict[op.tokenId] = [op];
        }
        return (parse_tree, parse_stack, ptr) => {
            if (ptr == 0 || parse_tree.length <= ptr)
                return false;
            if (!(parse_tree[ptr].id in dict))
                return false;
            var op1 = parse_stack.pop();
            var op2 = parse_tree[ptr+1];
            var result = null;
            for (var operator of dict[parse_tree[ptr].id]) {
                if (operator.checker(parse_tree[ptr], [op1, op2])) {
                    result = operator.handler(op1, op2);
                    break;
                }
            }
            if (result != null) {
                parse_stack.push(result);
                return true;
            }
            return false;
        };
    }

    /**
     * Builds the handler-function for single operators.
     * @returns the operator-handler-function
     */
    buildSingleOperators() {
        var dict = {};
        for (var op of this.singleOperators) {
            if (op.tokenId in dict)
                dict[op.tokenId].push(op)
            else
                dict[op.tokenId] = [op];
        }
        return (parse_tree, parse_stack, ptr) => {
            if (parse_tree.length < ptr)
                return false;
            if (!(parse_tree[ptr].id in dict))
                return false;
                var result = null;
                for (var operator of dict[parse_tree[ptr].id]) {
                    if (operator.checker(parse_tree[ptr], [])) {
                        result = operator.handler();
                        break;
                    }
                }
            if (result != null) {
                parse_stack.push(result);
                return true;
            }
            return false;
        }
    }
}

exports.JtexCommand = JtexCommand;