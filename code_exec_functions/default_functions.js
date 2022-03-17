const { Tokens } = require("../constants.js");
const { Token } = require("../tokenizer.js");
const pUtils = require("../utils/parser_utils.js");

function write(...str) {
    for (var mStr of str) {
        var token = new Token(Tokens.ANY).initFrom(this.cRefToken).withData(mStr);
        this.ctx.parser.tokenizer.queueToken(token);
    }
}

function interpret(str) {
    var tokens = pUtils.tokenizeSubstring(str, this.cRefToken);
    this.ctx.parser.tokenizer.queueTokens(tokens);
}

function matrix(matrix, type="pmatrix") {
    var mwrite = write.bind(this);
    mwrite("\\begin{" + type + "}\n");
    for (var i = 0; i < matrix.length; i++) {
        if (Array.isArray(matrix[i])) {
            mwrite(matrix[i].map(el => el.toString()).join(" & "));
        } else {
            mwrite(matrix[i].toString());
        }
        mwrite("\\\\\n");
    }
    mwrite("\\end{" + type + "}\n");
}

function mgen(w, h, gen = (i, j) => 1) {
    return Array.apply(null, Array(h)).map((x, i) => Array.apply(null, Array(w)).map((y, j) => gen(i, j)));
}

function generate() {
    return {
        "write": write,
        "interpret": interpret,
        "matrix": matrix,
        "mgen": mgen
    };
}

exports.generate = generate;