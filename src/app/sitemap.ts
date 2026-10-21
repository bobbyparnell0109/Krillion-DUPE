import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "", priority: 1, changeFrequency: "daily" as const },
    { path: "/play/daily", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/play/infinite", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/how-to-play", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/leaderboard", priority: 0.6, changeFrequency: "hourly" as const },
    { path: "/about", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  ];
  return pages.map((p) => ({ url: `${SITE.url}${p.path}`, lastModified: new Date(), changeFrequency: p.changeFrequency, priority: p.priority }));
}
