const { ParserError } = require('../errors/parser_error');

class Structure {
    /**
     * 
     * @param {boolean} metatokens if this structure is a metastructure
     */
    constructor(metastructure=false) {
        this.metastructure = metastructure;

        if (this.constructor == Structure)
            throw new ParserError("Abstract class cannot be instantiated.");
    }

    tokenize() {
        throw ParserError("Method 'tokenize' must be implemented.");
    }

    isMeta() {
        return this.metastructure;
    }

    getMeta() {
        if (typeof this.metadata === "undefined")
            this.metadata = {};
        return this.metadata;
    }

    /**
     * 
     * @param {string} property 
     * @param {object} defaultValue
     */
    getProperty(property, defaultValue = null) {
        if (typeof this.metadata == "undefined")
            return defaultValue;

        if (this.metadata[property] == undefined)
            return defaultValue;
        
        return this.metadata[property];
    }

    /**
     * Sets or overwrites a property
     * @param {string} property 
     * @param {object} value 
     */
    setProperty(property, value) {
        this.getMeta()[property] = value;
    }

    /**
     * Removes a property from the metadata
     * @param {string} property 
     */
    removeProperty(property) {
        if (this.getProperty(property, undefined) == undefined)
            return;

        this.metadata.delete(property);
    }

    toString() {
        return this.tokenize().map(token => token.toString()).reduce((x, y) => x + y);
    }
}

exports.Structure = Structure;