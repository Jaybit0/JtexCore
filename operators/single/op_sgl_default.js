const { ParserTokens } = require("../../constants");
const { Operator, OperatorType } = require("../operator");
const {ParserToken} = require("../../parser_token");

/**
 * Generates all single operators implemented in this file.
 * This function is required for the operator_loader to recognize the module and should not be called manually.
 * @returns the list of operators
 */
function generate() {
    var opImplies = new Operator(OperatorType.SINGLE_OPERATOR, ParserTokens.IMPLIES, singleOperatorImplies)
    .injectToCommand("default.math.inline")
    .injectToCommand("default.math.block");
    var opImpliedby = new Operator(OperatorType.SINGLE_OPERATOR, ParserTokens.IMPLIED_BY, singleOperatorImpliedBy)
    .injectToCommand("default.math.inline")
    .injectToCommand("default.math.block");
    var opIff = new Operator(OperatorType.SINGLE_OPERATOR, ParserTokens.IFF, singleOperatorIff)
    .injectToCommand("default.math.inline")
    .injectToCommand("default.math.block");
    var opTripleDot = new Operator(OperatorType.SINGLE_OPERATOR, ParserTokens.TRIPLE_DOT, singleOperatorTripleDot)
    .injectToCommand("default.math.inline")
    .injectToCommand("default.math.block");
    return [opImplies, opImpliedby, opIff, opTripleDot]
}

/**
 * Converts '=>' to '\\implies{}'.
 * @returns a parser token
 */
function singleOperatorImplies() { 
    return new ParserToken(ParserTokens.STRING).withData("\\implies{}");
}

/**
 * Converts '<=' to '\\impliedby{}'.
 * @returns a parser token
 */
function singleOperatorImpliedBy() {
    return new ParserToken(ParserTokens.STRING).withData("\\impliedby{}");
}

/**
 * Converts '<=>' to '\\iff{}'.
 * @returns a parser token
 */
function singleOperatorIff() {
    return new ParserToken(ParserTokens.STRING).withData("\\iff{}");
}

/**
 * Converts '...' to '\\ldots'.
 * @returns a parser token
 */
 function singleOperatorTripleDot() {
    return new ParserToken(ParserTokens.STRING).withData("\\ldots");
}

exports.generate = generate