module.exports = function(env) {
    const path = require('path');
    const { ParserTokens } = require(path.join(env.base, "constants.js"));
    const { Operator, OperatorType } = require(path.join(env.base, "operators", "operator.js"));
    const {ParserToken} = require(path.join(env.base, "parser_token.js"));
    
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
        var opColon = new Operator(OperatorType.SINGLE_OPERATOR, ParserTokens.COLON, singleOperatorColon)
        .injectToCommand("default.math.inline")
        .injectToCommand("default.math.block");
        var opColonEqq = new Operator(OperatorType.SINGLE_OPERATOR, ParserTokens.COLON_EQUALS, singleOperatorColonEqq)
        .injectToCommand("default.math.inline")
        .injectToCommand("default.math.block");
        var opEqqColon = new Operator(OperatorType.SINGLE_OPERATOR, ParserTokens.EQUALS_COLON, singleOperatorEqqColon)
        .injectToCommand("default.math.inline")
        .injectToCommand("default.math.block");
        return [opImplies, opImpliedby, opIff, opTripleDot, opColon, opColonEqq, opEqqColon]
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
     * Converts '...' to '\\ldots{}'.
     * @returns a parser token
     */
    function singleOperatorTripleDot() {
        return new ParserToken(ParserTokens.STRING).withData("\\ldots{}");
    }
    
    /**
     * Converts ':' to '\\colon{}'.
     * @returns a parser token
     */
    function singleOperatorColon() {
        return new ParserToken(ParserTokens.STRING).withData("\\colon{}");
    }
    
    /**
     * Converts ':=' to '\\coloneqq{}'.
     * @returns a parser token
     */
    function singleOperatorColonEqq() {
        return new ParserToken(ParserTokens.STRING).withData("\\coloneqq{}");
    }
    
    /**
     * Converts '=:' to '\\eqqcolon{}'.
     * @returns a parser token
     */
    function singleOperatorEqqColon() {
        return new ParserToken(ParserTokens.STRING).withData("\\eqqcolon{}");
    }
    
    return generate();
}