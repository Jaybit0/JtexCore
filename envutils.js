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
        src: ["operators", "unary"],
        dest: ["operators", "default", "unary"]
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

    getRequiredLaTeXPackages() {
        // TODO: Implement
        return ["amsmath"];
    }

    getJtexTemplates() {
        // Read all folders (not files) in template directory
        const entries = fs.readdirSync(path.join(this.path, "templates"), { withFileTypes: true });
        return entries.filter(folder => folder.isDirectory()).map(folder => folder.name);
    }

    getJtexTemplateFiles(template) {
        return this.listFiles(path.join(this.path, "templates", template));
    }

    /**
     * Makes a template from a JTeX project
     * @param {string} template The template name
     * @param {string} directory The directory from the original JTeX project
     */
    makeTemplate(template, directory) {
        const files = this.listFiles(directory);
        for (const file of files) {
            const relativePath = path.relative(directory, file);

            // Skip if file lies in the '.compiled/' directory
            if (relativePath.startsWith(".compiled"))
                continue;

            // Remove any git files
            if (relativePath.startsWith(".git"))
                continue;
            
            // Remove .gitignore file
            if (relativePath === ".gitignore")
                continue;

            const destPath = path.join(this.path, "templates", template, relativePath);
            if (!fs.existsSync(path.dirname(destPath)))
                fs.mkdirSync(path.dirname(destPath), {recursive: true});
            fs.copyFileSync(file, destPath);
        }
    }

    /**
     * Creates a JTeX project from a template
     * @param {string} directory The directory to create the project in
     * @param {string} template The template name
     * @returns {boolean} Whether the project was created successfully
     */
    createProject(directory, template) {
        const files = this.listFiles(path.join(this.path, "templates", template));
        for (const file of files) {
            const relativePath = path.relative(path.join(this.path, "templates", template), file);
            const destPath = path.join(directory, relativePath);
            if (!fs.existsSync(path.dirname(destPath)))
                fs.mkdirSync(path.dirname(destPath), {recursive: true});
            fs.copyFileSync(file, destPath);
        }
        return true;
    }
}

exports.JtexEnvironment = JtexEnvironment;