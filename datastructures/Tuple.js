const { Structure } = require("./Structure");
const { TokenCollection } = require("./TokenCollection");
const { Tokens } = require("../constants");
const { Tokenizer, Token } = require("../tokenizer");

class Tuple extends Structure {
    /**
     * 
     * @param {Array<Structure>} rawData the raw data containing meta-structure separators
     */
    constructor(rawData) {
        super(false);
        this.rawData = rawData;
        this.data = this.rawData.filter(entry => !entry.isMeta());
        this.annotationCache = {};
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
     * @param {int} i the index of the entry
     * @returns {Tuple<Token, Structure>}
     */
    getAnnotated(i) {
        if (i in this.annotationCache)
            return [...this.annotationCache[i]];

        const el = this.data[i];
        const tokens = el.data;
        var startIndex = 0;

        const checkWhitespace = () => {
            return startIndex < tokens.length 
                && tokens[startIndex] instanceof Token 
                && Tokenizer.isTokenWhitespaceOrComment(tokens[startIndex].id);
        };

        const invalid = () => {
            return startIndex >= tokens.length || !(tokens[startIndex] instanceof Token);
        };

        this.annotationCache[i] = [null, el];

        while (checkWhitespace())
            startIndex++;

        if (invalid() || tokens[startIndex].id != Tokens.VARNAME)
            return [null, el];

        var nameToken = tokens[startIndex];
        startIndex++;

        while (checkWhitespace())
            startIndex++;

        if (invalid() || tokens[startIndex].id != Tokens.COLON)
            return [null, el];

        startIndex++;

        while (checkWhitespace())
            startIndex++;

        this.annotationCache[i] = [nameToken, new TokenCollection(tokens.slice(startIndex))];

        return [...this.annotationCache[i]];
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