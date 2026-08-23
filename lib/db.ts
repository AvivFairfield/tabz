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

/*
  Blob overwrites take up to a minute to propagate, which breaks
  read-after-write. So every save is a NEW immutable blob named by
  timestamp (immediately readable), reads pick the newest, and old
  versions are pruned best-effort.
*/
const BLOB_PREFIX = "trip/";
const KEEP_VERSIONS = 5;

async function latestBlob() {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 1000 });
  return blobs.sort((x, y) => y.pathname.localeCompare(x.pathname));
}

async function readTripBlob(): Promise<TripData> {
  const blobs = await latestBlob();
  if (blobs.length === 0) {
    await writeTripBlob(SEED);
    return SEED;
  }
  const res = await fetch(blobs[0].url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to read ledger from blob storage");
  return (await res.json()) as TripData;
}

async function writeTripBlob(data: TripData): Promise<void> {
  const { put, del } = await import("@vercel/blob");
  const name = `${BLOB_PREFIX}${String(Date.now()).padStart(14, "0")}.json`;
  await put(name, JSON.stringify(data, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
  // prune old versions; failures here never block the save
  try {
    const blobs = await latestBlob();
    const stale = blobs.slice(KEEP_VERSIONS);
    if (stale.length > 0) await del(stale.map((b) => b.url));
  } catch {}
}
