const { ParserTokens, Tokens } = require("../../constants");
const { Operator, OperatorType } = require("../operator");
const {ParserToken} = require("../../parser_token");

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

function binaryOperatorFrac(op1, op2) {
    return new ParserToken(ParserTokens.STRING).at(op1, op2).withData("\\frac{" + op1.unwrap().toString() + "}{" + op2.unwrap().toString() + "}");
}

function binaryOperatorMul(op1, op2) {
    return new ParserToken(ParserTokens.STRING).at(op1, op2).withData(op1.unwrap().toString() + "\\cdot{}" + op2.unwrap().toString());
}

function binaryOperatorPow(op1, op2) {
    if (op2.beginToken.id == Tokens.UNDERSCORE && op2.beginToken == op2.endToken)
        return new ParserToken(ParserTokens.STRING).at(op1, op2).withData("\\overline{" + op1.unwrap().toString() + "}");
    return new ParserToken(ParserTokens.STRING).at(op1, op2).withData(op1.unwrap().toString() + "^{" + op2.unwrap().toString() + "}");
}

function binaryOperatorIntegral(op1, op2) {
    return new ParserToken(ParserTokens.STRING).at(op1, op2).withData("\\int_{" + op1.unwrap().toString() + "}^{" + op2.unwrap().toString() + "}");
}

function binaryOperatorSubscript(op1, op2) {
    return new ParserToken(ParserTokens.STRING).at(op1, op2).withData(op1.toString() + "_{" + op2.unwrap().toString() + "}");
}

exports.generate = generate;