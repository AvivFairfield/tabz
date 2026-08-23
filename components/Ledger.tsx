"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Check, PencilSimple, Trash } from "@phosphor-icons/react";
import type { Expense, Traveler, TravelerId, TripData } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";
import { formatDate, type TripSummary, type CategoryTotal } from "@/lib/format";
import type { Fmt } from "./Dashboard";

export default function Ledger({
  data,
  summary,
  fmt,
  onDelete,
  onRename,
}: {
  data: TripData;
  summary: TripSummary;
  fmt: Fmt;
  onDelete: (id: string) => void;
  onRename: (id: TravelerId, name: string) => Promise<void>;
}) {
  const reduce = useReducedMotion();
  const [a, b] = data.travelers;

  return (
    <section aria-label="Travelers" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <PersonPanel
        traveler={a}
        expenses={data.expenses.filter((e) => e.payerId === "a")}
        total={summary.spentBy.a}
        categories={summary.categoriesBy.a}
        fmt={fmt}
        reduce={!!reduce}
        onDelete={onDelete}
        onRename={onRename}
      />
      <PersonPanel
        traveler={b}
        expenses={data.expenses.filter((e) => e.payerId === "b")}
        total={summary.spentBy.b}
        categories={summary.categoriesBy.b}
        fmt={fmt}
        reduce={!!reduce}
        onDelete={onDelete}
        onRename={onRename}
      />
    </section>
  );
}

function PersonPanel({
  traveler,
  expenses,
  total,
  categories,
  fmt,
  reduce,
  onDelete,
  onRename,
}: {
  traveler: Traveler;
  expenses: Expense[];
  total: number;
  categories: CategoryTotal[];
  fmt: Fmt;
  reduce: boolean;
  onDelete: (id: string) => void;
  onRename: (id: TravelerId, name: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(traveler.name);
  const [saving, setSaving] = useState(false);

  const sorted = [...expenses].sort((x, y) =>
    x.date === y.date ? y.createdAt - x.createdAt : y.date < x.date ? -1 : 1
  );

  async function save() {
    const next = draft.trim();
    if (!next || next === traveler.name) {
      setEditing(false);
      setDraft(traveler.name);
      return;
    }
    setSaving(true);
    try {
      await onRename(traveler.id, next);
      setEditing(false);
    } catch {
      setDraft(traveler.name);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-hairline bg-surface-1">
      <header className="flex items-center justify-between border-b border-hairline bg-surface-2/70 px-5 py-4">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="flex items-center gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              maxLength={24}
              aria-label="Traveler name"
              className="w-36 rounded-lg border border-hairline-strong bg-surface-2 px-2.5 py-1 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-vermilion/40"
            />
            <button
              type="submit"
              disabled={saving}
              aria-label="Save name"
              className="rounded-md p-1.5 text-moss transition-colors hover:bg-surface-3"
            >
              <Check size={16} weight="bold" />
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{traveler.name}</h2>
            <button
              onClick={() => setEditing(true)}
              aria-label={`Rename ${traveler.name}`}
              className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-3 hover:text-ink-muted"
            >
              <PencilSimple size={14} weight="bold" />
            </button>
          </div>
        )}
        <span className="font-mono text-xl tracking-tight">{fmt(total)}</span>
      </header>

      {categories.length > 0 && (
        <div className="space-y-3 border-b border-hairline px-5 py-4">
          {categories.map(({ category, total: catTotal, share }) => (
            <div key={category}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-ink-muted">
                  <span className="mr-1.5 text-ink-faint" aria-hidden>
                    {CATEGORY_LABELS[category].kanji}
                  </span>
                  {CATEGORY_LABELS[category].label}
                </span>
                <span className="font-mono">{fmt(catTotal)}</span>
              </div>
              <div
                className="mt-1.5 h-0.5 rounded-full bg-vermilion/70"
                style={{ width: `${Math.max(share * 100, 3)}%` }}
                aria-hidden
              />
            </div>
          ))}
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-ink-subtle">
          Nothing logged for {traveler.name} yet.
        </p>
      ) : (
        <ul className="flex-1 divide-y divide-hairline/60">
          <AnimatePresence initial={false}>
            {sorted.map((e) => (
              <ExpenseRow key={e.id} expense={e} fmt={fmt} reduce={reduce} onDelete={() => onDelete(e.id)} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function ExpenseRow({
  expense,
  fmt,
  reduce,
  onDelete,
}: {
  expense: Expense;
  fmt: Fmt;
  reduce: boolean;
  onDelete: () => void;
}) {
  const cat = CATEGORY_LABELS[expense.category];
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 2500);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, height: 0, overflow: "hidden" }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="group flex items-center gap-3 px-4 py-2.5 sm:px-5"
    >
      <span className="w-14 shrink-0 font-mono text-xs text-ink-faint">
        {formatDate(expense.date)}
      </span>
      <span
        title={cat.label}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-hairline bg-surface-2 text-xs text-ink-muted"
        aria-label={cat.label}
      >
        {cat.kanji}
      </span>
      <p className="min-w-0 flex-1 truncate text-sm text-ink">{expense.title}</p>
      <p className="font-mono text-sm">{fmt(expense.amount)}</p>
      <button
        onClick={() => (armed ? onDelete() : setArmed(true))}
        aria-label={armed ? `Confirm delete ${expense.title}` : `Delete ${expense.title}`}
        className={`flex items-center gap-1 rounded-md p-1.5 transition-all focus-visible:opacity-100 active:scale-[0.95] ${
          armed
            ? "bg-vermilion/15 text-vermilion"
            : "text-ink-faint hover:bg-surface-3 hover:text-vermilion sm:opacity-0 sm:group-hover:opacity-100"
        }`}
      >
        <Trash size={14} weight="bold" aria-hidden />
        {armed && <span className="text-xs font-medium">Sure?</span>}
      </button>
    </motion.li>
  );
}
