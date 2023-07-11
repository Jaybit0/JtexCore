const { Structure } = require("./Structure");

class TokenCollection extends Structure {

    /**
     * 
     * @param {Array<Token|Structure>} tokens
     * @param {boolean} metastructure if this token-collection contains meta-tokens
     */
    constructor(tokens, metastructure=false) {
        super(metastructure);
        this.data = tokens;
    }

    /**
     * 
     * @param {int} i the index
     * @returns the element at the index specified
     */
    get(i) {
        return this.data[i];
    }

    /**
     * 
     * @returns {int} the length of the TokenCollection
     */
    length() {
        return this.data.length;
    }

    tokenize() {
        return this.data.map(entry => (entry instanceof Structure ? entry.tokenize() : entry)).flat(1);
    }
}

exports.TokenCollection = TokenCollection;