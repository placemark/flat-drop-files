import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";

import pkg from "./package.json";

const plugins = [
  nodeResolve(), // so Rollup can find node modules
  commonjs(), // so Rollup can convert node modules to an ES module
  typescript({ tsconfig: "./tsconfig.json" }), // so Rollup can convert TypeScript to JavaScript
  terser(),
];

export default [
  // browser-friendly UMD build
  {
    input: "src/index.ts",
    output: {
      sourcemap: true,
      file: pkg.browser,
      format: "umd",
      name: "flatdropfiles",
    },
    plugins,
  },

  // CommonJS (for Node) and ES module (for bundlers) build.
  // (We could have three entries in the configuration array
  // instead of two, but it's quicker to generate multiple
  // builds from a single configuration where possible, using
  // an array for the `output` option, where we can specify
  // `file` and `format` for each target)
  {
    input: "src/index.ts",
    output: [
      { file: pkg.main, format: "cjs", sourcemap: true },
      { file: pkg.module, format: "es", sourcemap: true },
    ],
    plugins,
  },
];
