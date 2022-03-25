const Tokens = {
    EOF: 0,
    BACKSLASH: 1,
    COMMENT: 2,
    USE: 3,
    VARNAME: 4,
    ANY: 5,
    EMPTY: 6,
    PARENTHESIS_OPEN: 7,
    PARENTHESIS_CLOSED: 8,
    CURLY_BRACKET_OPEN: 9,
    CURLY_BRACKET_CLOSED: 10,
    SQUARE_BRACKET_OPEN: 11,
    SQUARE_BRACKET_CLOSED: 12,
    SEMICOLON: 13,
    DOUBLE_DASH: 14,
    COMMA: 15,
    WHITESPACE: 16,
    BLOCK_COMMENT: 17,
    LATEX_COMMAND: 18,
    SLASH: 19,
    STAR: 20,
    ROOF: 21,
    DOUBLE_SLASH: 22,
    EQUALS: 23,
    EQUALS_GREATER_THAN: 24,
    LESS_THAN_EQUALS: 25,
    LESS_THAN_EQUALS_GREATER_THAN: 26,
    UNDERSCORE: 27,
    DASH: 28,
    DOT: 29,
    TRIPLE_DOT: 30
};

const ParserTokens = {
    STRING: 0,
    FRACTION: 1,
    MULTIPLY: 2,
    POWER: 3,
    INTEGRAL: 4,
    IMPLIES: 5,
    IMPLIED_BY: 6,
    IFF: 7, 
    SUBSCRIPT: 8
};

exports.Tokens = Tokens;
exports.ParserTokens = ParserTokens;