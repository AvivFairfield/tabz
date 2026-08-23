import { ImageResponse } from "next/og";
import { loadLogoFont, LogoTile } from "@/lib/logo-tile";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds home-screen icons itself, so this one is full-bleed
export default async function AppleIcon() {
  const font = await loadLogoFont();
  return new ImageResponse(
    <LogoTile size={size.width} rounded={false} withGlyph={font !== null} />,
    {
      ...size,
      fonts: font ? [{ name: "Noto Sans JP", data: font, weight: 700, style: "normal" }] : undefined,
    }
  );
}
