/**
 * Splits a string at its linebreaks.
 * @param {string} str a string
 * @returns 
 */
function splitLinebreaks(str) {
    var dats = str.split("\r\n");
    var out = [];
    for (var dat of dats) {
        var subsplit = dat.split("\n");
        out.push(...subsplit)
    }
    return out
}

exports.splitLinebreaks = splitLinebreaks;