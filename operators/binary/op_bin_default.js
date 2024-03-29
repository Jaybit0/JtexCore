module.exports = function(env) {
    const path = require('path');
    const { ParserTokens, Tokens } = require(path.join(env.base, "constants.js"));
    const { Operator, OperatorType } = require(path.join(env.base, "operators", "operator.js"));
    const {ParserToken} = require(path.join(env.base, "parser_token.js"));
    
    /**
     * Generates all binary operators implemented in this file.
     * This function is required for the operator_loader to recognize the module and should not be called manually.
     * @returns the list of operators
     */
    function generate() {
        var opFrac = new Operator(OperatorType.BINARY_OPERATOR, ParserTokens.FRACTION, binaryOperatorFrac)
            .injectToCommand("default.math.inline")
            .injectToCommand("default.math.block");
        var opMul = new Operator(OperatorType.BINARY_OPERATOR, ParserTokens.MULTIPLY, binaryOperatorMul)
            .injectToCommand("default.math.inline")
            .injectToCommand("default.math.block");
        var opPow = new Operator(OperatorType.BINARY_OPERATOR, ParserTokens.POWER, binaryOperatorPow)
            .injectToCommand("default.math.inline")
            .injectToCommand("default.math.block");
        var opIntegral = new Operator(OperatorType.BINARY_OPERATOR, ParserTokens.INTEGRAL, binaryOperatorIntegral)
            .injectToCommand("default.math.inline")
            .injectToCommand("default.math.block");
        var opSubscript = new Operator(OperatorType.BINARY_OPERATOR, ParserTokens.SUBSCRIPT, binaryOperatorSubscript)
            .injectToCommand("default.math.inline")
            .injectToCommand("default.math.block");
        return [opFrac, opMul, opPow, opIntegral, opSubscript];
    }
    
    /**
     * Converts 'op1/op2' to '\\frac{op1}{op2}'.
     * @param {ParserToken} op1 the left operand
     * @param {ParserToken} op2 the right operand
     * @returns a parser token
     */
    function binaryOperatorFrac(op1, op2) {
        return new ParserToken(ParserTokens.STRING).at(op1, op2).withData("\\frac{" + op1.unwrap().toString() + "}{" + op2.unwrap().toString() + "}");
    }
    
    /**
     * Converts 'op1*op2' to 'op1\\cdot{}op2'.
     * @param {ParserToken} op1 the left operand
     * @param {ParserToken} op2 the right operand
     * @returns a parser token
     */
    function binaryOperatorMul(op1, op2) {
        return [new ParserToken(ParserTokens.STRING).at(op1, op2).withData(op1.toString()),
            new ParserToken(ParserTokens.STRING).at(op1, op2).withData("\\cdot{}"),
            new ParserToken(ParserTokens.STRING).at(op1, op2).withData(op2.toString())];
    }
    
    /**
     * Converts 'op1^op2' to '{op1}^{op2}'.
     * @param {ParserToken} op1 the left operand
     * @param {ParserToken} op2 the right operand
     * @returns a parser token
     */
    function binaryOperatorPow(op1, op2) {
        if (op2.beginToken.id == Tokens.UNDERSCORE && op2.beginToken == op2.endToken)
            return new ParserToken(ParserTokens.STRING).at(op1, op2).withData("\\overline{" + op1.unwrap().toString() + "}");
        return [
            new ParserToken(ParserTokens.STRING).at(op1, op2).withData(op1.toString()),
            new ParserToken(ParserTokens.STRING).at(op1, op2).withData("^"),
            new ParserToken(ParserTokens.STRING).at(op1, op2).withData("{" + op2.unwrap().toString() + "}")
        ];
    }
    
    /**
     * Converts 'op1//op2' to '\\int_{op1}^{op2}'.
     * @param {ParserToken} op1 the left operand
     * @param {ParserToken} op2 the right operand
     * @returns a parser token
     */
    function binaryOperatorIntegral(op1, op2) {
        return new ParserToken(ParserTokens.STRING).at(op1, op2).withData("\\int_{" + op1.unwrap().toString() + "}^{" + op2.unwrap().toString() + "}");
    }
    
    /**
     * Converts 'op1_op2' to '{op1}_{op2}'.
     * @param {ParserToken} op1 the left operand
     * @param {ParserToken} op2 the right operand
     * @returns a parser token
     */
    function binaryOperatorSubscript(op1, op2) {
        return [
            new ParserToken(ParserTokens.STRING).at(op1, op2).withData(op1.toString()),
            new ParserToken(ParserTokens.STRING).at(op1, op2).withData("_"),
            new ParserToken(ParserTokens.STRING).at(op1, op2).withData("{" + op2.unwrap().toString() + "}")
        ];
    }
    
    return generate();
}