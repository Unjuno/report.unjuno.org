import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  publicDir: "./.home-public/",
  outDir: "./build/",
  build: {
    format: "directory",
  },
  trailingSlash: "always",
});
