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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFx3b3JrXFxcXG1vZGVybml6ZS1yZWFjdC12NFxcXFxwYWNrYWdlc1xcXFx0eXBlc2NyaXB0XFxcXG1haW5cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXHdvcmtcXFxcbW9kZXJuaXplLXJlYWN0LXY0XFxcXHBhY2thZ2VzXFxcXHR5cGVzY3JpcHRcXFxcbWFpblxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovd29yay9tb2Rlcm5pemUtcmVhY3QtdjQvcGFja2FnZXMvdHlwZXNjcmlwdC9tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IGZzIGZyb20gJ2ZzL3Byb21pc2VzJztcclxuaW1wb3J0IHN2Z3IgZnJvbSAnQHN2Z3Ivcm9sbHVwJztcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgICAgYWxpYXM6IHtcclxuICAgICAgICAgICAgc3JjOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpLFxyXG4gICAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgZXNidWlsZDoge1xyXG4gICAgICAgIGxvYWRlcjogJ3RzeCcsXHJcbiAgICAgICAgaW5jbHVkZTogL3NyY1xcLy4qXFwudHN4PyQvLFxyXG4gICAgICAgIGV4Y2x1ZGU6IFtdLFxyXG4gICAgfSxcclxuICAgIG9wdGltaXplRGVwczoge1xyXG4gICAgICAgIGVzYnVpbGRPcHRpb25zOiB7XHJcbiAgICAgICAgICAgIHBsdWdpbnM6IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnbG9hZC1qcy1maWxlcy1hcy10c3gnLFxyXG4gICAgICAgICAgICAgICAgICAgIHNldHVwKGJ1aWxkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1aWxkLm9uTG9hZChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgZmlsdGVyOiAvc3JjXFxcXC4qXFwuanMkLyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXN5bmMgKGFyZ3MpID0+ICh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9hZGVyOiAndHN4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50czogYXdhaXQgZnMucmVhZEZpbGUoYXJncy5wYXRoLCAndXRmOCcpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICB9LFxyXG4gICAgfSxcclxuXHJcblxyXG4gICAgXHJcbiAgICAvLyBwbHVnaW5zOiBbcmVhY3QoKSxzdmdyKHtcclxuICAgIC8vICAgZXhwb3J0QXNEZWZhdWx0OiB0cnVlXHJcbiAgICAvLyB9KV0sXHJcblxyXG4gICAgcGx1Z2luczogW3N2Z3IoKSwgcmVhY3QoKV0sXHJcbn0pOyJdLAogICJtYXBwaW5ncyI6ICI7QUFBdVYsU0FBUyxvQkFBb0I7QUFDcFgsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUN4QixPQUFPLFFBQVE7QUFDZixPQUFPLFVBQVU7QUFKakIsSUFBTSxtQ0FBbUM7QUFPekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDeEIsU0FBUztBQUFBLElBQ0wsT0FBTztBQUFBLE1BQ0gsS0FBSyxRQUFRLGtDQUFXLEtBQUs7QUFBQSxJQUNqQztBQUFBLEVBQ0o7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLFNBQVM7QUFBQSxJQUNULFNBQVMsQ0FBQztBQUFBLEVBQ2Q7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNWLGdCQUFnQjtBQUFBLE1BQ1osU0FBUztBQUFBLFFBQ0w7QUFBQSxVQUNJLE1BQU07QUFBQSxVQUNOLE1BQU0sT0FBTztBQUNULGtCQUFNO0FBQUEsY0FDRixFQUFFLFFBQVEsZUFBZTtBQUFBLGNBQ3pCLE9BQU8sVUFBVTtBQUFBLGdCQUNiLFFBQVE7QUFBQSxnQkFDUixVQUFVLE1BQU0sR0FBRyxTQUFTLEtBQUssTUFBTSxNQUFNO0FBQUEsY0FDakQ7QUFBQSxZQUNKO0FBQUEsVUFDSjtBQUFBLFFBQ0o7QUFBQSxNQUNKO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVFBLFNBQVMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO0FBQzdCLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
