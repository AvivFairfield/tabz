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

export const CATEGORY_LABELS: Record<Category, { label: string; kanji: string }> = {
  food: { label: "Food", kanji: "食" },
  transport: { label: "Transport", kanji: "交" },
  stay: { label: "Stay", kanji: "宿" },
  activities: { label: "Activities", kanji: "遊" },
  shopping: { label: "Shopping", kanji: "買" },
  other: { label: "Other", kanji: "他" },
};
