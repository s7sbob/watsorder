// vite.config.ts
import { defineConfig } from "file:///D:/work/modernize-react-v4/packages/typescript/main/node_modules/vite/dist/node/index.js";
import react from "file:///D:/work/modernize-react-v4/packages/typescript/main/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { resolve } from "path";
import fs from "fs/promises";
import svgr from "file:///D:/work/modernize-react-v4/packages/typescript/main/node_modules/@svgr/rollup/dist/index.js";
var __vite_injected_original_dirname = "D:\\work\\modernize-react-v4\\packages\\typescript\\main";
var vite_config_default = defineConfig({
  resolve: {
    alias: {
      src: resolve(__vite_injected_original_dirname, "src")
    }
  },
  esbuild: {
    loader: "tsx",
    include: /src\/.*\.tsx?$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        {
          name: "load-js-files-as-tsx",
          setup(build) {
            build.onLoad(
              { filter: /src\\.*\.js$/ },
              async (args) => ({
                loader: "tsx",
                contents: await fs.readFile(args.path, "utf8")
              })
            );
          }
        }
      ]
    }
  },
  // plugins: [react(),svgr({
  //   exportAsDefault: true
  // })],
  plugins: [svgr(), react()]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFx3b3JrXFxcXG1vZGVybml6ZS1yZWFjdC12NFxcXFxwYWNrYWdlc1xcXFx0eXBlc2NyaXB0XFxcXG1haW5cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXHdvcmtcXFxcbW9kZXJuaXplLXJlYWN0LXY0XFxcXHBhY2thZ2VzXFxcXHR5cGVzY3JpcHRcXFxcbWFpblxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovd29yay9tb2Rlcm5pemUtcmVhY3QtdjQvcGFja2FnZXMvdHlwZXNjcmlwdC9tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzL3Byb21pc2VzJztcbmltcG9ydCBzdmdyIGZyb20gJ0BzdmdyL3JvbGx1cCc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICAgIHJlc29sdmU6IHtcbiAgICAgICAgYWxpYXM6IHtcbiAgICAgICAgICAgIHNyYzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSxcbiAgICAgICAgfSxcbiAgICB9LFxuICAgIGVzYnVpbGQ6IHtcbiAgICAgICAgbG9hZGVyOiAndHN4JyxcbiAgICAgICAgaW5jbHVkZTogL3NyY1xcLy4qXFwudHN4PyQvLFxuICAgICAgICBleGNsdWRlOiBbXSxcbiAgICB9LFxuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgICBlc2J1aWxkT3B0aW9uczoge1xuICAgICAgICAgICAgcGx1Z2luczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2xvYWQtanMtZmlsZXMtYXMtdHN4JyxcbiAgICAgICAgICAgICAgICAgICAgc2V0dXAoYnVpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1aWxkLm9uTG9hZChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGZpbHRlcjogL3NyY1xcXFwuKlxcLmpzJC8gfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3luYyAoYXJncykgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9hZGVyOiAndHN4JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudHM6IGF3YWl0IGZzLnJlYWRGaWxlKGFyZ3MucGF0aCwgJ3V0ZjgnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG5cbiAgICBcbiAgICAvLyBwbHVnaW5zOiBbcmVhY3QoKSxzdmdyKHtcbiAgICAvLyAgIGV4cG9ydEFzRGVmYXVsdDogdHJ1ZVxuICAgIC8vIH0pXSxcblxuICAgIHBsdWdpbnM6IFtzdmdyKCksIHJlYWN0KCldLFxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUF1VixTQUFTLG9CQUFvQjtBQUNwWCxPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBQ3hCLE9BQU8sUUFBUTtBQUNmLE9BQU8sVUFBVTtBQUpqQixJQUFNLG1DQUFtQztBQU96QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUN4QixTQUFTO0FBQUEsSUFDTCxPQUFPO0FBQUEsTUFDSCxLQUFLLFFBQVEsa0NBQVcsS0FBSztBQUFBLElBQ2pDO0FBQUEsRUFDSjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsU0FBUztBQUFBLElBQ1QsU0FBUyxDQUFDO0FBQUEsRUFDZDtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1YsZ0JBQWdCO0FBQUEsTUFDWixTQUFTO0FBQUEsUUFDTDtBQUFBLFVBQ0ksTUFBTTtBQUFBLFVBQ04sTUFBTSxPQUFPO0FBQ1Qsa0JBQU07QUFBQSxjQUNGLEVBQUUsUUFBUSxlQUFlO0FBQUEsY0FDekIsT0FBTyxVQUFVO0FBQUEsZ0JBQ2IsUUFBUTtBQUFBLGdCQUNSLFVBQVUsTUFBTSxHQUFHLFNBQVMsS0FBSyxNQUFNLE1BQU07QUFBQSxjQUNqRDtBQUFBLFlBQ0o7QUFBQSxVQUNKO0FBQUEsUUFDSjtBQUFBLE1BQ0o7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBUUEsU0FBUyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUM7QUFDN0IsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
