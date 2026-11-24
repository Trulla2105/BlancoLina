import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.nombre} | ${SITE.bajada}`,
    short_name: SITE.nombre,
    description: SITE.descripcion,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7a1f2b",
    icons: [
      { src: "/pwa-icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
