const { ParserError } = require('../errors/parser_error');

class Structure {
    /**
     * 
     * @param {boolean} metatokens if this structure is a metastructure
     */
    constructor(metastructure=false) {
        this.metastructure = metastructure;
        if (this.constructor == Structure) {
            throw new ParserError("Abstract class cannot be instantiated.");
        }
    }

    tokenize() {
        throw ParserError("Method 'tokenize' must be implemented.");
    }

    isMeta() {
        return this.metastructure;
    }

    toString() {
        return this.tokenize().map(token => token.toString()).reduce((x, y) => x + y);
    }
}

exports.Structure = Structure;