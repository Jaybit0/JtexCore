class ParameterList {
    /**
     * 
     * @param {object[]} params the raw parameter-list 
     */
    constructor(params) {
        this.params = params;
    }

    /**
     * Retrieves a certain parameter.
     * @param {string} name the parameter-name 
     * @returns the requested parameter or null if not available
     */
    getParam(name) {
        for (var param of this.params) {
            if (param.param == name)
                return param;
        }
        return null;
    }

    /**
     * 
     * @returns all optional parameters
     */
    getParams() {
        return this.params;
    }

    /**
     * Handles a certain parameter if existing.
     * Otherwise, the handler will not be called.
     * @param {string} name the parameter-name 
     * @param {function(object)} handler the parameter-handler
     * @returns this instance
     */
    handleParam(name, handler) {
        var param = this.getParam(name);
        if (param != null)
            handler(param);
        return this;
    }
}

exports.ParameterList = ParameterList;