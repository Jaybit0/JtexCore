module.exports = function(env) {
    const path = require('path');
    const { ParserTokens } = require(path.join(env.base, "constants.js"));
    const { Operator, OperatorType } = require(path.join(env.base, "operators", "operator.js"));
    const {ParserToken} = require(path.join(env.base, "parser_token.js"));

    /**
     * Generates all unary operators implemented in this file.
     * This function is required for the operator_loader to recognize the module and should not be called manually.
     * @returns the list of operators
     */
    function generate() {
        var opSet = new Operator(OperatorType.UNARY_OPERATOR, ParserTokens.SET, unaryOperatorSet)
            .injectToCommand("default.math.inline")
            .injectToCommand("default.math.block");
        return [opSet];
    }

    function unaryOperatorSet(op1) {
        switch (op1.data) {
            case "u":
                return new ParserToken(ParserTokens.STRING).withData("\\cup{}");
            case "U":
                return new ParserToken(ParserTokens.STRING).withData("\\bigcup");
            case "n":
                return new ParserToken(ParserTokens.STRING).withData("\\cap{}");
            case "N":
                return new ParserToken(ParserTokens.STRING).withData("\\bigcap");
            case "d":
                return new ParserToken(ParserTokens.STRING).withData("\\setminus{}");
            default:
                return new ParserToken(ParserTokens.STRING).withData("\\left\\{" + op1.data + "\\right\\}");
        }
    }

    return generate();
};