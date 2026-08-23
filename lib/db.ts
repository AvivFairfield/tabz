import { promises as fs } from "fs";
import path from "path";
import type { TripData } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "trip.json");

const DEFAULT_DATA: TripData = {
  travelers: [
    { id: "a", name: "Aviv" },
    { id: "b", name: "Friend" },
  ],
  expenses: [],
};

export async function readTrip(): Promise<TripData> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as TripData;
  } catch {
    await writeTrip(DEFAULT_DATA);
    return DEFAULT_DATA;
  }
}

export async function writeTrip(data: TripData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = DATA_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, DATA_FILE);
}
