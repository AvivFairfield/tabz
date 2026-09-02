"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { X } from "@phosphor-icons/react";
import type { Category, Expense, TravelerId, TripData } from "@/lib/types";
import { CATEGORIES, CATEGORY_LABELS, withAlpha } from "@/lib/types";
import { CURRENCIES, formatYen, type Currency, type Rates } from "@/lib/format";

export interface NewExpense {
  title: string;
  amount: number;
  category: Category;
  /** "both" logs the full amount once per traveler (add only) */
  payerId: TravelerId | "both";
  date: string;
}

export default function ExpenseModal({
  data,
  initial,
  rates,
  onClose,
  onSubmit,
}: {
  data: TripData;
  /** When set, the modal edits this expense instead of creating one */
  initial?: Expense | null;
  /** JPY→ILS/USD multipliers; foreign entry is disabled while null */
  rates: Rates | null;
  onClose: () => void;
  onSubmit: (expense: NewExpense) => Promise<void>;
}) {
  const reduce = useReducedMotion();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "food");
  // for new expenses, default to whoever logged the previous one
  const [payerId, setPayerId] = useState<TravelerId | "both">(() => {
    if (initial) return initial.payerId;
    const saved = window.localStorage.getItem("tabi-payer");
    return saved === "a" || saved === "b" || saved === "both" ? saved : "a";
  });
  const [date, setDate] = useState(() => initial?.date ?? new Date().toISOString().slice(0, 10));
  // what the typed amount is denominated in; converted to yen on save
  const [entryCurrency, setEntryCurrency] = useState<Currency>("JPY");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = Number(amount.replace(/[,\s]/g, ""));
    if (!title.trim()) return setError("Give the expense a name.");
    if (!Number.isFinite(parsed) || parsed <= 0)
      return setError(
        entryCurrency === "JPY"
          ? "Enter the amount in yen, like 3200."
          : "Enter the amount, like 25.50."
      );
    const inYen = entryCurrency === "JPY" ? parsed : rates ? parsed / rates[entryCurrency] : null;
    if (inYen === null)
      return setError("No exchange rate right now — enter the amount in yen.");
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        amount: Math.round(inYen),
        category,
        payerId,
        date,
      });
      if (!initial) window.localStorage.setItem("tabi-payer", payerId);
      onClose();
    } catch {
      setError("Could not save the expense. Try again.");
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-hairline bg-surface-1 px-3 py-2.5 text-ink placeholder:text-ink-faint focus:border-hairline-strong focus:outline-none focus:ring-2 focus:ring-vermilion/40";

  const parsedLive = Number(amount.replace(/[,\s]/g, ""));
  const amountHint =
    entryCurrency === "JPY"
      ? "Whole yen, no decimals."
      : rates && Number.isFinite(parsedLive) && parsedLive > 0
        ? `Saved as ${formatYen(Math.round(parsedLive / rates[entryCurrency]))}.`
        : "Converted to yen when saved.";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={initial ? "Edit expense" : "Add expense"}
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-hairline bg-surface-2 p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            {initial ? "Edit expense" : "Add expense"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-ink-subtle transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="exp-title" className="block text-sm font-medium text-ink-muted">
              What was it
            </label>
            <input
              id="exp-title"
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ichiran ramen, Shinjuku…"
              autoComplete="off"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="exp-amount" className="block text-sm font-medium text-ink-muted">
                  Amount
                </label>
                <div role="group" aria-label="Entry currency" className="flex gap-1">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setEntryCurrency(c.code)}
                      disabled={c.code !== "JPY" && !rates}
                      aria-pressed={entryCurrency === c.code}
                      title={
                        c.code !== "JPY" && !rates
                          ? "No exchange rate right now"
                          : `Enter the amount in ${c.label}`
                      }
                      className={`flex h-6 w-6 items-center justify-center rounded-md border font-mono text-xs transition-colors active:scale-[0.95] disabled:opacity-40 ${
                        entryCurrency === c.code
                          ? "border-vermilion/60 bg-vermilion/10 text-ink"
                          : "border-hairline bg-surface-1 text-ink-subtle hover:text-ink-muted"
                      }`}
                    >
                      {c.symbol}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-ink-subtle">
                  {CURRENCIES.find((c) => c.code === entryCurrency)!.symbol}
                </span>
                <input
                  id="exp-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode={entryCurrency === "JPY" ? "numeric" : "decimal"}
                  autoComplete="off"
                  placeholder={entryCurrency === "JPY" ? "3,200…" : "25.50…"}
                  className={`${inputClass} pl-8 font-mono`}
                />
              </div>
              <p className="text-xs text-ink-subtle">{amountHint}</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="exp-date" className="block text-sm font-medium text-ink-muted">
                Date
              </label>
              <input
                id="exp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-ink-muted">Paid by</span>
            <div className={`grid gap-2 ${initial ? "grid-cols-2" : "grid-cols-3"}`}>
              {[
                ...data.travelers.map((t) => ({ id: t.id as TravelerId | "both", label: t.name })),
                // an edit always belongs to one person; "both" only makes sense when adding
                ...(initial ? [] : [{ id: "both" as const, label: "Both" }]),
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPayerId(opt.id)}
                  aria-pressed={payerId === opt.id}
                  title={opt.id === "both" ? "Log this amount for each of them" : undefined}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors active:scale-[0.98] ${
                    payerId === opt.id
                      ? "border-vermilion/60 bg-vermilion/10 text-ink"
                      : "border-hairline bg-surface-1 text-ink-subtle hover:text-ink-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-ink-muted">Category</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {CATEGORIES.map((c) => {
                const meta = CATEGORY_LABELS[c];
                const selected = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    aria-pressed={selected}
                    title={meta.label}
                    style={
                      selected
                        ? { borderColor: withAlpha(meta.color, 0.65), background: withAlpha(meta.color, 0.14) }
                        : undefined
                    }
                    className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 transition-colors active:scale-[0.98] ${
                      selected
                        ? "text-ink"
                        : "border-hairline bg-surface-1 text-ink-subtle hover:text-ink-muted"
                    }`}
                  >
                    <span className="text-lg leading-none" style={{ color: meta.color }} aria-hidden>
                      {meta.kanji}
                    </span>
                    <span className="text-[11px]">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-vermilion">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-ink-subtle transition-colors hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-vermilion px-5 py-2 text-sm font-medium text-canvas transition-all hover:bg-vermilion-hover active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "Saving…" : initial ? "Save changes" : "Add expense"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
