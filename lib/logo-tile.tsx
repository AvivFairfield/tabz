/*
  The Tabz mark as an image: vermilion tile with a white 旅, rendered by
  next/og for the favicon, home-screen icons and manifest. The kanji needs
  a CJK font, so a one-glyph Noto Sans JP subset is fetched from Google
  Fonts at build time.
*/

export const LOGO_BG = "#ff5747";

export async function loadLogoFont(): Promise<ArrayBuffer | null> {
  try {
    // no User-Agent header -> Google serves TTF, which the image renderer accepts
    const css = await (
      await fetch("https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=旅")
    ).text();
    const match = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
    if (!match) return null;
    return await (await fetch(match[1])).arrayBuffer();
  } catch {
    return null;
  }
}

export function LogoTile({
  size,
  rounded,
  withGlyph,
}: {
  size: number;
  rounded: boolean;
  withGlyph: boolean;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: LOGO_BG,
        borderRadius: rounded ? Math.round(size * 0.22) : 0,
        color: "#ffffff",
        fontFamily: "Noto Sans JP",
        fontWeight: 700,
        fontSize: Math.round(size * 0.58),
        lineHeight: 1,
      }}
    >
      {/* Noto Sans JP's ascender-heavy metrics sit the glyph ~3.1% low; lift it to the optical centre */}
      <span style={{ position: "relative", top: -Math.round(size * 0.031) }}>{withGlyph ? "旅" : ""}</span>
    </div>
  );
}
