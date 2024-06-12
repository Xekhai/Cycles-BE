const fs = require('fs');
const path = require('path');

function getProjectStructure(dir, depth = 0) {
  const indent = ' '.repeat(depth * 2);
  const filesAndDirs = fs.readdirSync(dir);

  filesAndDirs.forEach((fileOrDir) => {
    const fullPath = path.join(dir, fileOrDir);
    const stats = fs.statSync(fullPath);

    if (fileOrDir === 'node_modules') {
      // Skip node_modules directory
      return;
    }

    console.log(`${indent}${fileOrDir}`);

    if (stats.isDirectory()) {
      getProjectStructure(fullPath, depth + 1);
    }
  });
}

const projectRoot = path.resolve(__dirname); // Change this if you want to specify a different directory
getProjectStructure(projectRoot);
