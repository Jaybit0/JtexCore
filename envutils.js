const path = require("path");
const fs = require("fs");

const initialEnvDirs = [
    ["commands", "default"],
    ["operators", "default", "binary"],
    ["operators", "default", "unary"],
    ["operators", "default", "single"],
    ["custom", "code_exec_functions"]
];

const copy = [
    {
        src: ["commands", "default"],
        dest: ["commands", "default"]
    },
    {
        src: ["operators", "binary"],
        dest: ["operators", "default", "binary"]
    },
    {
        src: ["operators", "single"],
        dest: ["operators", "default", "single"]
    },
    {
        src: ["code_exec_functions"],
        dest: ["custom", "code_exec_functions"]
    }
];

class JtexEnvironment {
    /**
     * 
     * @param {string} path the absolute environment path 
     */
    constructor(path) {
        this.path = path;
        this.base = __dirname;
    }

    isInitialized() {
        return fs.existsSync(this.path);
    }

    init(force=false) {
        if (!fs.existsSync(this.path))
            fs.mkdirSync(this.path, {recursive: true});
        for (const dir of initialEnvDirs)
            if (!fs.existsSync(path.join(this.path, ...dir)))
                fs.mkdirSync(path.join(this.path, ...dir), { recursive: true });
        for (const copyDir of copy)
            for (const file of this.listFiles(path.join(__dirname, ...copyDir.src)))
                if (force || !fs.existsSync(path.join(this.path, ...copyDir.dest, path.basename(file))))
                    fs.copyFileSync(file, path.join(this.path, ...copyDir.dest, path.basename(file)));
        return this;
    }

    getJtexCommandFiles() {
        return this.listFiles(path.join(this.path, 'commands'));
    }

    getAllJtexOperatorFiles(...type) {
        const files = [];
        for (var t of type) {
            files.push(...this.getJtexOperatorFiles(t));
        }
        return files;
    }

    getJtexOperatorFiles(type) {
        const entries = fs.readdirSync(path.join(this.path, 'operators'), { withFileTypes: true });
        const folders = entries.filter(folder => folder.isDirectory());
        const files = [];
        for (const folder of folders)
            if (fs.existsSync(path.join(this.path, 'operators', folder.name, type))) 
                for (const file of this.listFiles(path.join(this.path, 'operators', folder.name, type)))
                    files.push(file);
        return files;
    }

    getCustomFiles(id) {
        return this.listFiles(path.join(this.path, "custom", id));
    }

    listFiles(dir, recursively=true) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const files = entries.filter(file => !file.isDirectory()).map(file => path.join(dir, file.name));
        const folders = entries.filter(folder => folder.isDirectory()).map(file => path.join(dir, file.name));
        if (recursively) {
            for (const folder of folders) {
                files.push(...this.listFiles(folder, recursively));
            }
        }
        return files;
    }
}

exports.JtexEnvironment = JtexEnvironment;