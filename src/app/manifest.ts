import type { MetadataRoute } from "next";
import { app } from "@/copy";
import { themeColor } from "@/styles/theme-color";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: app.name,
    short_name: app.name,
    description: app.description,
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: themeColor.day,
    theme_color: themeColor.day,
    categories: ["travel", "social", "games"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
