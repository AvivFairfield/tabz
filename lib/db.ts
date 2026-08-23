import { promises as fs } from "fs";
import path from "path";
import type { TripData } from "./types";
import seed from "@/data/trip.json";

/*
  Storage: a single trip.json document.
  - Locally: read/write the file in /data (simple, greppable, in git).
  - On Vercel: the filesystem is read-only, so the same document lives in
    Vercel Blob instead. Detected via BLOB_READ_WRITE_TOKEN, which Vercel
    injects once a Blob store is connected to the project.
  The committed data/trip.json is bundled as the seed for first run.
*/

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "trip.json");
const BLOB_PATHNAME = "trip.json";

const SEED = seed as unknown as TripData;

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function readTrip(): Promise<TripData> {
  if (useBlob()) return readTripBlob();
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as TripData;
  } catch {
    await writeTrip(SEED);
    return SEED;
  }
}

export async function writeTrip(data: TripData): Promise<void> {
  if (useBlob()) return writeTripBlob(data);
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = DATA_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, DATA_FILE);
}

async function readTripBlob(): Promise<TripData> {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
  if (blobs.length === 0) {
    await writeTripBlob(SEED);
    return SEED;
  }
  // cache-busting query keeps the CDN from serving a stale ledger
  const res = await fetch(`${blobs[0].url}?v=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to read ledger from blob storage");
  return (await res.json()) as TripData;
}

async function writeTripBlob(data: TripData): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATHNAME, JSON.stringify(data, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
