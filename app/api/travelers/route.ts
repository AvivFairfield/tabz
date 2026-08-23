import { readTrip, writeTrip } from "@/lib/db";
import type { TravelerId } from "@/lib/types";

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const id = body?.id as TravelerId;
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (id !== "a" && id !== "b")
    return Response.json({ error: "Unknown traveler" }, { status: 400 });
  if (!name || name.length > 24)
    return Response.json({ error: "Name must be 1-24 characters" }, { status: 400 });

  const data = await readTrip();
  const traveler = data.travelers.find((t) => t.id === id);
  if (!traveler) return Response.json({ error: "Traveler not found" }, { status: 404 });
  traveler.name = name;
  await writeTrip(data);
  return Response.json(traveler);
}
