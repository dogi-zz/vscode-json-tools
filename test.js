
console.info("test");

const fs = require("fs");

let ext_dir = fs.readdirSync('node_modules').filter(dir => fs.statSync('node_modules/' + dir).isDirectory());

let parser_dir = fs.readdirSync('../parser/node_modules').filter(dir => fs.statSync('../parser/node_modules/' + dir).isDirectory());

let ext_version = {};
ext_dir.forEach(dir => {
    let file = 'node_modules/' + dir + '/package.json';
    if (fs.existsSync(file)) {
        ext_version[dir] = JSON.parse(fs.readFileSync(file, 'UTF-8')).version;
    }
});

let parser_version = {};
parser_dir.forEach(dir => {
    let file = '../parser/node_modules/' + dir + '/package.json';
    if (fs.existsSync(file)) {
        parser_version[dir] = JSON.parse(fs.readFileSync(file, 'UTF-8')).version;
    }
});


console.info("=====================================");
Object.keys(parser_version).forEach(dir => {
    if (!fs.existsSync('node_modules/' + dir)) {
        console.info("cp -r ../parser/node_modules/" + dir + " node_modules/");
    }
});
// cp -r ../parser/node_modules/abbrev node_modules/

console.info("=====================================");

Object.keys(parser_version).forEach(dir => {
    if (ext_version[dir]) {
        if (ext_version[dir] !== parser_version[dir]) {
            console.info(dir, ext_version[dir], parser_version[dir]);
        }
    }
});
