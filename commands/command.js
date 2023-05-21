const { Tokens } = require("../constants.js");
const {OperatorType} = require("../operators/operator.js");

class JtexCommand {
    /**
     * 
     * @param { string } name the name of the command
     * @param { [int] } token_id the id of the command-token after '--'
     * @param { [function(ParserToken): boolean] } checker a checker function to determine if the token represents the command
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
     * @param {function(LineBuffer, ParserContext, object[]): void} handler a handler function
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
        this.unaryOperator = this.buildUnaryOperators();
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
        return (parse_tree, parse_stack, ptr, incPtrFunc) => {
            if (ptr == 0 || parse_tree.length <= ptr + 1)
                return false;
            if (!(parse_tree[ptr].id in dict))
                return false;

            var op1 = parse_stack.pop();
            var cachedOps = [op1];

            // While the operand is a whitespace, we pop the next operand
            //while (op1.beginToken.id == Tokens.WHITESPACE) {
            while (op1.wraps == 0 && op1.data.replace(/\s/g, "").length == 0) {
                if (parse_stack.length == 0) {
                    while (cachedOps.length > 0) {
                        parse_stack.push(cachedOps.pop());
                    }
                    // TODO: Understand why I wrote the commented line below...
                    // incPtrFunc(-1);
                    return false;
                }
                op1 = parse_stack.pop();
                cachedOps.push(op1);
            }
            var mptr = ptr+1;
            var op2 = parse_tree[mptr];

            // While the operand is a whitespace, we move to the next operand
            //while (op2.beginToken.id == Tokens.WHITESPACE) {
            while (op2.wraps == 0 && op2.data.replace(/\s/g, "").length == 0) {
                mptr = incPtrFunc(1)+1;
                if (parse_tree.length <= mptr) {
                    while (cachedOps.length > 0) {
                        parse_stack.push(cachedOps.pop());
                    }
                    incPtrFunc(ptr+1-mptr);
                    return false;
                }  
                op2 = parse_tree[mptr];
            }

            var result = null;
            for (var operator of dict[parse_tree[ptr].id]) {
                if (operator.checker(parse_tree[ptr], [op1, op2])) {
                    result = operator.handler(op1, op2);
                    break;
                }
            }
            if (result != null) {
                if (Array.isArray(result)) {
                    parse_stack.push(...result);
                    return true;
                } else {
                    parse_stack.push(result.at(op1, op2));
                    return true;
                }
            }
            return false;
        };
    }

    /**
     * Builds the handler-function for unary operators.
     * @returns the operator-handler-function
     */
    buildUnaryOperators() {
        var dict = {};
        for (var op of this.unaryOperators) {
            if (op.tokenId in dict)
                dict[op.tokenId].push(op)
            else
                dict[op.tokenId] = [op];
        }
        return (parse_tree, parse_stack, ptr, incPtrFunc) => {
            if (parse_tree.length <= ptr+1)
                return false;
            if (!(parse_tree[ptr].id in dict))
                return false;
            
            var mptr = ptr +1;
            var op1 = parse_tree[mptr];
            var cachedOps = []

            // While the operator is a whitespace, we move to the next operator
            while (op1.wraps == 0 && op1.data.replace(/\s/g, "").length == 0) {
                mptr = incPtrFunc(1)+1;
                if (parse_tree.length <= mptr) {
                    while (cachedOps.length > 0) {
                        parse_stack.push(cachedOps.pop());
                    }
                    incPtrFunc(ptr+1-mptr);
                    return false;
                }  
                op1 = parse_tree[mptr];
            }

            var result = null;
            for (var operator of dict[parse_tree[ptr].id]) {
                if (operator.checker(parse_tree[ptr], [op1])) {
                    result = operator.handler(op1);
                    break;
                }
            }
            if (result != null) {
                if (Array.isArray(result)) {
                    parse_stack.push(...result);
                    return true;
                } else {
                    parse_stack.push(result.at(parse_tree[ptr]));
                    return true;
                }
            }
            return false;
        }
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
        return (parse_tree, parse_stack, ptr, incPtrFunc) => {
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
                if (Array.isArray(result)) {
                    parse_stack.push(...result);
                    return true;
                } else {
                    parse_stack.push(result.at(parse_tree[ptr]));
                    return true;
                }
            }
            return false;
        }
    }
}

exports.JtexCommand = JtexCommand;