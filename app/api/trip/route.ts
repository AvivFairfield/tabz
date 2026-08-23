import { readTrip } from "@/lib/db";

export async function GET() {
  const data = await readTrip();
  return Response.json(data);
}
