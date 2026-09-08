import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  base: "/mapa-forca-24/",

  tanstackStart: {
    server: {
      entry: "server",
    },

    prerender: {
      enabled: true,
      autoSubfolderIndex: true,
      autoStaticPathsDiscovery: true,
      crawlLinks: true,
      failOnError: true,
    },
  },
});
