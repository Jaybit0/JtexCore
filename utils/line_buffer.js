class LineBuffer {
    /**
     * Creates a new line buffer.
     * @param {string[]} buffer a pre-filled line-buffer array
     */
    constructor(buffer = [""]) {
        this.lineBuffer = buffer;
    }

    /**
     * Appends a string to the current line. 
     * Note that the given string should not contain line-breaks.
     * To handle strings with line-breaks, use appendMany(splitLinebreaks(str)) from utils/string_utils.js
     * @param {string} str a string without line-breaks
     * @returns {LineBuffer} this line-buffer
     */
    append(str) {
        this.lineBuffer[this.lineBuffer.length-1] += str;
        return this;
    }

    /**
     * Appends a string to a new line.
     * Note that the given string should not contain line-breaks.
     * To handle strings with line-breaks, use appendManyNewLine(splitLinebreaks(str)) from utils/string_utils.js
     * @param {string} str a string without line-breaks
     * @returns {LineBuffer} this line-buffer
     */
    appendNewLine(str) {
        this.lineBuffer.push(str);
        return this;
    }

    /**
     * Appends many strings each to a new line except for the first one.
     * Note that the given strings should not contain line-breaks.
     * To handle strings with line-breaks, consider using appendMany(splitLinebreaks(str)) from utils/string_utils.js for each element in the array
     * @param {string[]} str an array of strings without line-breaks
     * @returns {LineBuffer} this line-buffer
     */
    appendMany(str) {
        if (str.length == 0)
            return this;
        this.lineBuffer[this.lineBuffer.length-1] += str[0];
        for (var i = 1; i < str.length; i++)
            this.lineBuffer.push(str[i])
        return this;
    }

    /**
     * Appends many strings each to to a new line.
     * Note that the given strings should not contain line-breaks.
     * To handle strings with line-breaks, consider using appendManyNewLine(splitLinebreaks(str)) from utils/string_utils.js for each element in the array
     * @param {string[]} str an array of strings without line-breaks 
     * @returns {LineBuffer} this line-buffer
     */
    appendManyNewLine(str) {
        if (str.length == 0)
            return this;
        this.lineBuffer.push(...str);
        return this;
    }

    /**
     * Converts the buffer to a single string, where each line is separated by the given splitter.
     * @param {string} splitter the line-splitter 
     * @returns {string} the corresponding buffer-string
     */
    toString(splitter) {
        return this.lineBuffer.join(splitter);
    }
}

exports.LineBuffer = LineBuffer;