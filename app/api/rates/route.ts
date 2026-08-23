// JPY -> ILS/USD via the ECB-backed frankfurter.app (no key needed),
// cached for an hour. Falls back to rough static rates if the fetch fails.
const FALLBACK = { rates: { ILS: 0.023, USD: 0.0066 }, live: false };

export async function GET() {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=JPY&to=ILS,USD", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const ILS = Number(data?.rates?.ILS);
    const USD = Number(data?.rates?.USD);
    if (!Number.isFinite(ILS) || !Number.isFinite(USD)) throw new Error();
    return Response.json({ rates: { ILS, USD }, live: true });
  } catch {
    return Response.json(FALLBACK);
  }
}
