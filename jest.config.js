// import { pathsToModuleNameMapper } from 'ts-jest';
// import compilerOptions from './tsconfig'

const esModules = ['uuid'].join('|');

export default (path, options) =>({
  "verbose": true,
  "rootDir": ".",
  "moduleDirectories": [
    "node_modules",
  ],
  transformIgnorePatterns: [`<rootDir>\/(?!(/node_modules/(?!${esModules})))\/`],
  // modulePaths: ["./packages/miroir-standalone-app/src/"], // <-- This will be set to 'baseUrl' value
  modulePaths: ["./src/"], // <-- This will be set to 'baseUrl' value
  // modulePaths: [compilerOptions.baseUrl], // <-- This will be set to 'baseUrl' value
  moduleNameMapper: 
    // Object.assign(
      {
      // "^miroir-fwk(.*)$": "<rootDir>/src/$1",
      // "^(.*)$": "$1",
      '\\.(css|scss|sass)$': 'identity-obj-proxy',
      }
    // pathsToModuleNameMapper(compilerOptions.paths /*, { prefix: '<rootDir>/' } */)
    // )
  ,
  // resolver:options.defaultResolver(path, {...options}),
  testEnvironment: "node",
  moduleFileExtensions:[
    "ts", "tsx", "js", "mjs", "cjs", "jsx", "json", "node"
  ],
  // preset:'ts-jest/presets/default-esm',
  "transform": {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // useESM:true,
        // tsconfig: "../../tsconfig.json"
        tsconfig: 
        {
          resolveJsonModule: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports:true,
          allowJs: true,
          moduleResolution: "node",
          // module: "ESNext",
          // target: "ES2017",
                // rootDir: "./src/",
          traceResolution: true,
          module:"commonjs"
        },
      }
    ],
    "^.+\\.js?$": ["babel-jest"],
  },
  // moduleNameMapper: {
  //   "^miroir-fwk\/(.+)$": "<rootDir>/src/$1",
  //   '\\.(css|scss|sass)$': 'identity-obj-proxy',
  // },
  "testPathIgnorePatterns": [
    "./node_modules/",
    "./.cache/"
  ],
})