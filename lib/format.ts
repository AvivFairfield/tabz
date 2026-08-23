import { CATEGORIES, type Expense, type TravelerId } from "./types";

const yen = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export function formatYen(amount: number): string {
  return yen.format(amount);
}

export type Currency = "JPY" | "ILS" | "USD";
export const CURRENCIES: { code: Currency; symbol: string; label: string }[] = [
  { code: "JPY", symbol: "¥", label: "Japanese yen" },
  { code: "ILS", symbol: "₪", label: "Israeli shekel" },
  { code: "USD", symbol: "$", label: "US dollar" },
];

export interface Rates {
  ILS: number;
  USD: number;
}

/** Amounts are stored in yen; other currencies are converted for display. */
export function formatMoney(amountJpy: number, currency: Currency, rates: Rates | null): string {
  if (currency === "JPY" || !rates) return formatYen(amountJpy);
  const value = amountJpy * rates[currency];
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
  }).format(value);
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatDayHeading(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export interface CategoryTotal {
  category: Expense["category"];
  total: number;
  share: number;
}

export interface TripSummary {
  total: number;
  spentBy: Record<TravelerId, number>;
  categoriesBy: Record<TravelerId, CategoryTotal[]>;
}

export function summarize(expenses: Expense[]): TripSummary {
  const spentBy: Record<TravelerId, number> = { a: 0, b: 0 };
  const maps: Record<TravelerId, Map<Expense["category"], number>> = {
    a: new Map(),
    b: new Map(),
  };
  let total = 0;
  for (const e of expenses) {
    total += e.amount;
    spentBy[e.payerId] += e.amount;
    maps[e.payerId].set(e.category, (maps[e.payerId].get(e.category) ?? 0) + e.amount);
  }
  const toSorted = (id: TravelerId): CategoryTotal[] =>
    [...maps[id].entries()]
      .sort((x, y) => y[1] - x[1])
      .map(([category, catTotal]) => ({
        category,
        total: catTotal,
        share: spentBy[id] > 0 ? catTotal / spentBy[id] : 0,
      }));
  return { total, spentBy, categoriesBy: { a: toSorted("a"), b: toSorted("b") } };
}

/** Combined per-category totals in fixed CATEGORIES order (pie slice order). */
export function combinedCategories(expenses: Expense[], total: number): CategoryTotal[] {
  const byCategory = new Map<Expense["category"], number>();
  for (const e of expenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }
  return CATEGORIES.filter((c) => byCategory.has(c)).map((category) => ({
    category,
    total: byCategory.get(category)!,
    share: total > 0 ? byCategory.get(category)! / total : 0,
  }));
}
