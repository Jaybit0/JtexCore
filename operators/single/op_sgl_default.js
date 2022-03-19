const { ParserTokens } = require("../../constants");
const { Operator, OperatorType } = require("../operator");
const {ParserToken} = require("../../parser_token");

function generate() {
    var opImplies = new Operator(OperatorType.SINGLE_OPERATOR, ParserTokens.IMPLIES, singleOperatorImplies).injectToCommand("default.math.inline").injectToCommand("default.math.block");
    return [opImplies]
}

function singleOperatorImplies() { 
    return new ParserToken(ParserTokens.STRING).withData("\\implies");
}

exports.generate = generate