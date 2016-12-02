'use strict';

const glob = require('glob');
const minimatch = require('minimatch');
const normalize = require('path').normalize;
const j = require('path').join;
const readFileSync = require('fs').readFileSync;
const readJsonParsed = (file) => JSON.parse(readFileSync(file, 'utf-8'));

const defaultOptions = {
  pkgJson: './package.json',
  nodeModules: './node_modules',
  onlySpecified: true
};

module.exports = function (filter, customOpts) {

  let allFiles = [];

  const options = Object.assign(defaultOptions, customOpts);

  //Get the package.json of the project
  const packageJson = readJsonParsed(options.pkgJson);
  const dependencies = packageJson.dependencies;
  const overrides = packageJson.overrides;

  //Apply the glob to all the dependencies in the package.json
  for (const dependency in dependencies) {
    const modulePath = j(options.nodeModules, dependency);

    //Read the package.json of a dependency
    const dependencyPkg = readJsonParsed(j(modulePath, 'package.json'));
    let depFiles;

    // Overrides current's package.json attributes
    if (overrides && overrides[dependency]) {
      for (const key in overrides[dependency]) {
        dependencyPkg[key] = overrides[dependency][key];
      }
    }

    //If you want to search through all files, just apply a glob to the entire directory, ignoring node_modules
    if (!options.onlySpecified) {
      depFiles = glob.sync(`./${j(modulePath, filter)}`, {
        //Ignore all files from nested node_modules folders
        ignore: j(modulePath, 'node_modules/**/*.*')
      });
      allFiles = allFiles.concat(depFiles);
    } else {
      depFiles = {};
      if (dependencyPkg.files) {
        dependencyPkg.files.map(e => depFiles[normalize(e)] = true);
      }

      ['main', 'style'].forEach(fileKey => {
        const file = (dependencyPkg[fileKey] || '');
        if (file && file.length && !depFiles[file]) {
          depFiles[normalize(file)] = true;
        }
      });

      depFiles = Object.keys(depFiles).reduce((arr, file) => {
        if (minimatch(file, filter)) {
          arr.push(`./${j(modulePath, file)}`);
        }
        return arr;
      }, []);

      allFiles = allFiles.concat(depFiles);
    }
  }
  return allFiles;
};
