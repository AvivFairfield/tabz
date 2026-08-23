import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tabz",
    short_name: "Tabz",
    description: "Spending tracker.",
    start_url: "/",
    display: "standalone",
    background_color: "#060709",
    theme_color: "#060709",
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
