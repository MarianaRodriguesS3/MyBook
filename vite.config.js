import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/MyBook/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "MyBook — Leitor de PDF",
        short_name: "MyBook",
        description:
          "Leitor de PDF com leitura em voz alta, histórico e temas.",
        start_url: "/MyBook/",
        scope: "/MyBook/",
        // "standalone" tira a barra de endereço quando aberto pelo
        // ícone instalado — é isso que dá a "cara de app"
        display: "standalone",
        // cor de fundo mostrada na tela de splash, antes do app carregar
        background_color: "#fbf5e6",
        // cor da barra de status/moldura do sistema operacional
        theme_color: "#efe2c2",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-maskable-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // deixa os arquivos da leitura (PDFs abertos, thumbnails do
        // histórico) funcionando offline depois da primeira visita
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ],
});
