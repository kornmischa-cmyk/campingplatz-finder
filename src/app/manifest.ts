import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Camping-Finder",
    short_name: "Camping-Finder",
    description: "Campingplätze im Umkreis per Radar finden",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#12140f",
    theme_color: "#12140f",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
