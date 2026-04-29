import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    build: "src/build.ts",
    core: "src/core.ts",
    element: "src/web-component.ts",
    react: "src/react.tsx",
  },
  format: ["esm"],
  target: "es2022",
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: ["astro", "react", "react-dom"],
});
