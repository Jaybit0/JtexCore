class LineBuffer {
    constructor(buffer = [""]) {
        this.lineBuffer = buffer;
    }

    append(str) {
        this.lineBuffer[this.lineBuffer.length-1] += str;
        return this;
    }

    appendNewLine(str) {
        this.lineBuffer.push(str);
        return this;
    }

    appendMany(str) {
        if (str.length == 0)
            return this;
        this.lineBuffer[this.lineBuffer.length-1] += str[0];
        for (var i = 1; i < str.length; i++) {
            this.lineBuffer.push(str[i])
        }
        return this;
    }

    appendManyNewLine(str) {
        if (str.length == 0)
            return this;
        this.lineBuffer.push(...str);
        return this;
    }

    toString(splitter) {
        return this.lineBuffer.join(splitter);
    }
}

exports.LineBuffer = LineBuffer;