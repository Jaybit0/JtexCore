const { Structure } = require("./Structure");

class Tuple extends Structure {
    /**
     * 
     * @param {Array<Structure>} rawData the raw data containing meta-structure separators
     */
    constructor(rawData) {
        super(false);
        this.rawData = rawData;
        this.data = this.rawData.filter(entry => !entry.isMeta());
    }

    /**
     * 
     * @param {int} i the index of the entry
     * @returns {Structure}
     */
    get(i) {
        return this.data[i];
    }

    /**
     * 
     * @returns the length of the tuple
     */
    length() {
        return this.data.length;
    }

    tokenize() {
        return this.rawData.map(entry => entry.tokenize()).flat(1);
    }
}

exports.Tuple = Tuple;