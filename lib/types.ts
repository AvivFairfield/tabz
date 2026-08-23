export type TravelerId = "a" | "b";

export interface Traveler {
  id: TravelerId;
  name: string;
}

export const CATEGORIES = [
  "food",
  "transport",
  "stay",
  "activities",
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
  /*
    Category hues are the dataviz reference dark palette rotated so blue
    lands on transport; adjacency in this fixed order (including the pie's
    wrap-around) is CVD-validated. Don't reorder without re-running
    the palette validator.
  */
  food: { label: "Food", kanji: "食", color: "#e66767" },
  transport: { label: "Transport", kanji: "交", color: "#3987e5" },
  stay: { label: "Stay", kanji: "宿", color: "#199e70" },
  activities: { label: "Activities", kanji: "遊", color: "#c98500" },
  shopping: { label: "Shopping", kanji: "買", color: "#008300" },
  other: { label: "Other", kanji: "他", color: "#9085e9" },
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
