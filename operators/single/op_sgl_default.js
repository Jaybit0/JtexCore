const { ParserTokens } = require("../../constants");
const { Operator, OperatorType } = require("../operator");
const {ParserToken} = require("../../parser_token");

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
    return [opImplies, opImpliedby, opIff]
}

function singleOperatorImplies() { 
    return new ParserToken(ParserTokens.STRING).withData("\\implies");
}

function singleOperatorImpliedBy() {
    return new ParserToken(ParserTokens.STRING).withData("\\impliedby");
}

function singleOperatorIff() {
    return new ParserToken(ParserTokens.STRING).withData("\\iff");
}

exports.generate = generate