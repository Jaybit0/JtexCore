const fs = require("fs")
const path = require("path")

// TODO: Make returned file-paths absolute. Note that the previous solution with absolute directories didn't work properly
/**
 * Retrieves all files from the given directory and all subdirectories.
 * @param {string} dirPath the directory
 * @param {string} arrayOfFiles an existing array of files (mainly used for recursion)
 * @returns a list of relative file-paths
 */
function getFiles(dirPath, arrayOfFiles = []) {
  files = fs.readdirSync(dirPath)

  arrayOfFiles = arrayOfFiles || []

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getFiles(dirPath + "/" + file, arrayOfFiles)
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file))
    }
  })

  return arrayOfFiles
}

exports.getFiles = getFiles;