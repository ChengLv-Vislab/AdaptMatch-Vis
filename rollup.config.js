import svelte from "rollup-plugin-svelte";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import rollup_start_dev from "./rollup_start_dev";
import replace from "@rollup/plugin-replace";

const production = !process.env.ROLLUP_WATCH;

export default {
  input: "src/main.js",
  external: ["d3"],
  output: {
    sourcemap: true,
    format: "iife",
    name: "app",
    file: "public/bundle.js",
    globals: { d3: "d3v7" },
  },
  plugins: [
    svelte({
      dev: !production,
      css: (css) => {
        css.write("bundle.css");
      },
    }),

    replace({
      PUBLIC_URL: "",
      preventAssignment: true
    }),

    resolve({
      browser: true,
      dedupe: (importee) =>
        importee === "svelte" || importee.startsWith("svelte/"),
    }),
    commonjs(),

    !production && rollup_start_dev,
  ],
  watch: {
    clearScreen: false,
  },
};
