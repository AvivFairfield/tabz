import { ImageResponse } from "next/og";
import { loadLogoFont, LogoTile } from "@/lib/logo-tile";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default async function Icon() {
  const font = await loadLogoFont();
  return new ImageResponse(<LogoTile size={size.width} rounded withGlyph={font !== null} />, {
    ...size,
    fonts: font ? [{ name: "Noto Sans JP", data: font, weight: 700, style: "normal" }] : undefined,
  });
}
