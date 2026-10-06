import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // host: true also serves the site on your Wi-Fi address (shown as "Network"
  // in the terminal), so a phone on the same Wi-Fi can open it.
  server: { host: true },
});
