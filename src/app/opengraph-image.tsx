import { ImageResponse } from "next/og";
import { SITE } from "@/config/site";
import { OG_SIZE, SiteCard } from "@/lib/share/card";

export const alt = `${SITE.name}: ${SITE.tagline}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<SiteCard />, OG_SIZE);
}
