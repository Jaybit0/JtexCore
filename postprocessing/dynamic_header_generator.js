function generateDynamicHeaders(data, necessaryPackages = []) {
    // Check if data contains a certain string
    if (data.includes("\\documenttype"))
        return data
    
    // Split data into lines
    var lines = data.split("\n");

    // Find all occurrences of \usepackage containing its arguments
    let regex = /\\usepackage\s*(\[\s*[^\]]*\s*\])?\{\s*[^}]*\s*\}/g;
    let parts = data.split(regex);
    let matches = data.match(regex);
    
    let indices = [];
    let currentIndex = 0;
    
    if (matches != null) {
        for (let i = 0; i < matches.length; i++) {
            let start = currentIndex;
            let end = start + matches[i].length;
            indices.push({
                start,
                end,
                matchedString: matches[i]
            });
            currentIndex += parts[i].length + matches[i].length;
        }
    }

    mdata = parts.join('');
    out = "% This header was automatically generated by JTeX\n"
    out += "% For more complex functionality, please generate the header yourself\n"
    out += "\\documentclass[12pt]{article}\n"
    for(index in indices) {
        out += "\n" + indices[index].matchedString
    }
    out += "\n\n\\makeatletter"
    out += "\n\\AddToHook{begindocument/before}\n{"
    for (let i = 0; i < necessaryPackages.length; i++) {
        out += "\n\t\\@ifpackageloaded{" + necessaryPackages[i] + "}{\\relax}\n\t{"
        out += "\n\t\t\\usepackage{" + necessaryPackages[i] + "}\n\t}";
    }
    out += "\n}"
    out += "\n\\makeatother\n"
    out += "\n\\begin{document}\n\n"
    out += mdata
    out += "\n\n\\end{document}"
    return out
}

exports.generateDynamicHeaders = generateDynamicHeaders;