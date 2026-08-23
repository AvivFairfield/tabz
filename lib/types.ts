export type TravelerId = "a" | "b";

export interface Traveler {
  id: TravelerId;
  name: string;
}

/*
  Order matters: it is the pie slice order (and the picker order). The
  hues are the original pastels deepened into the dark-mode band, and
  this arrangement (including the wrap-around) was brute-forced for the
  best colour-vision separation (worst adjacent ΔE 24.5). Re-run the
  dataviz palette validator before reordering or recolouring.
*/
export const CATEGORIES = [
  "food",
  "transport",
  "activities",
  "stay",
  "shopping",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: string;
  title: string;
  /** Amount in whole yen */
  amount: number;
  category: Category;
  payerId: TravelerId;
  /** ISO date (YYYY-MM-DD) the expense happened */
  date: string;
  createdAt: number;
}

export interface TripData {
  travelers: [Traveler, Traveler];
  expenses: Expense[];
}

export const CATEGORY_LABELS: Record<
  Category,
  { label: string; kanji: string; color: string }
> = {
  food: { label: "Food", kanji: "食", color: "#c28100" },
  transport: { label: "Transport", kanji: "交", color: "#2494cf" },
  activities: { label: "Activities", kanji: "遊", color: "#14a065" },
  stay: { label: "Stay", kanji: "宿", color: "#8f7fe8" },
  shopping: { label: "Shopping", kanji: "買", color: "#d4508a" },
  other: { label: "Other", kanji: "他", color: "#6b82c9" },
};

/** "#rrggbb" + alpha in 0..1 -> rgba-capable 8-digit hex */
export function withAlpha(hex: string, alpha: number): string {
  return (
    hex +
    Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0")
  );
}
