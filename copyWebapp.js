const fs = require("fs");
const path = require("path");

const getAllFilesForPathRecursive = (folder) => {
    const map = { ".": [] }
    const subPaths = fs.readdirSync(folder);

    for (const _path of subPaths) {
        const stats = fs.lstatSync(path.join(folder, _path))
        if (stats.isFile()) {
            map["."].push(_path);
        } else if (stats.isDirectory()) {
            map[_path] = getAllFilesForPathRecursive(path.join(folder, _path))
        }
    }

    return map;
}

const deletePathsContentRecursive = (folder, predicate) => {
    if (!fs.existsSync(folder)) return;

    const fromFiles = getAllFilesForPathRecursive(folder);

    const filteredFiles = fromFiles["."].filter(predicate);

    for (const _path of Object.keys(fromFiles)) {
        if (_path === ".") continue;

        const deletePath = path.join(folder, _path)

        deletePathsContentRecursive(deletePath);
        const newFiles = getAllFilesForPathRecursive(deletePath);
        if (Object.keys(newFiles).length === 1
            && newFiles["."].length === 0) {
            fs.rmdirSync(deletePath);
        }
    }

    for (const file of filteredFiles) {
        fs.rmSync(path.join(folder, file));
    }
}

const copyPathsRecursiveFromTo = (from, to) => {
    const fromFiles = getAllFilesForPathRecursive(from);

    if (!fs.existsSync(to)) {
        fs.mkdirSync(to, { recursive: true });
    }

    for (const _path of Object.keys(fromFiles)) {
        if (_path === ".") continue;
        copyPathsRecursiveFromTo(path.join(from, _path), path.join(to, _path));
    }

    for (const file of fromFiles["."]) {
        fs.copyFileSync(path.join(from, file), path.join(to, file));
    }
}


const main = async () => {

    console.log("COPY Build WebApp to API-public folder");

    const webPath = path.join(__dirname, "apps", "web", "dist");
    const appPath = path.join(__dirname, "apps", "gs-analysis", "dist");
    if (!fs.existsSync(webPath) || !fs.existsSync(appPath)) {
        return console.log("App was not build please run npm run build!");
    }

    deletePathsContentRecursive(path.join(appPath, "public", "assets"), (pathname) => pathname.endsWith(".css") || pathname.endsWith(".js"));

    copyPathsRecursiveFromTo(webPath, path.join(appPath, "public"));
}

main();
