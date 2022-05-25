/**
 * Dynamically loads all operators from all directories / subdirectories specified in 'locations'
 * @param {JtexEnvironment} env the environment
 * @returns a list of operators
 */
function loadOperators(env) {
    operatorGenerators = [];
    for (const f of env.getAllJtexOperatorFiles("binary", "single", "unary")) {
        try {
            operatorGenerators.push(...require(f)(env));
        } catch (err) {
            console.error("Could not load operators from file:", f);
            console.error(err);
        }
    }
    return operatorGenerators;
}

exports.loadOperators = loadOperators;