"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { X } from "@phosphor-icons/react";
import type { Category, Expense, TravelerId, TripData } from "@/lib/types";
import { CATEGORIES, CATEGORY_LABELS, withAlpha } from "@/lib/types";

export interface NewExpense {
  title: string;
  amount: number;
  category: Category;
  payerId: TravelerId;
  date: string;
}

export default function ExpenseModal({
  data,
  initial,
  onClose,
  onSubmit,
}: {
  data: TripData;
  /** When set, the modal edits this expense instead of creating one */
  initial?: Expense | null;
  onClose: () => void;
  onSubmit: (expense: NewExpense) => Promise<void>;
}) {
  const reduce = useReducedMotion();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "food");
  // for new expenses, default to whoever logged the previous one
  const [payerId, setPayerId] = useState<TravelerId>(() => {
    if (initial) return initial.payerId;
    const saved = window.localStorage.getItem("tabi-payer");
    return saved === "a" || saved === "b" ? saved : "a";
  });
  const [date, setDate] = useState(() => initial?.date ?? new Date().toISOString().slice(0, 10));
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
      return setError("Enter the amount in yen, like 3200.");
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        amount: Math.round(parsed),
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
              <label htmlFor="exp-amount" className="block text-sm font-medium text-ink-muted">
                Amount
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-ink-subtle">
                  ¥
                </span>
                <input
                  id="exp-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="3,200…"
                  className={`${inputClass} pl-8 font-mono`}
                />
              </div>
              <p className="text-xs text-ink-subtle">Whole yen, no decimals.</p>
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
            <div className="grid grid-cols-2 gap-2">
              {data.travelers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPayerId(t.id)}
                  aria-pressed={payerId === t.id}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors active:scale-[0.98] ${
                    payerId === t.id
                      ? "border-vermilion/60 bg-vermilion/10 text-ink"
                      : "border-hairline bg-surface-1 text-ink-subtle hover:text-ink-muted"
                  }`}
                >
                  {t.name}
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
