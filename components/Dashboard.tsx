"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowsClockwise, Plus } from "@phosphor-icons/react";
import type { TravelerId, TripData } from "@/lib/types";
import {
  CURRENCIES,
  formatMoney,
  summarize,
  trackingStats,
  type Currency,
  type Rates,
} from "@/lib/format";
import Ledger from "./Ledger";
import ExpenseModal, { type NewExpense } from "./ExpenseModal";

const BackgroundScene = dynamic(() => import("./three/BackgroundScene"), {
  ssr: false,
});

export type Fmt = (amountJpy: number) => string;

export default function Dashboard() {
  const [data, setData] = useState<TripData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currency, setCurrency] = useState<Currency>("JPY");
  const [rates, setRates] = useState<Rates | null>(null);
  const reduce = useReducedMotion();

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch("/api/trip");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const saved = window.localStorage.getItem("tabi-currency");
    if (saved === "JPY" || saved === "ILS" || saved === "USD") setCurrency(saved);
    fetch("/api/rates")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.rates && setRates(j.rates))
      .catch(() => {});
  }, []);

  function switchCurrency(next: Currency) {
    setCurrency(next);
    window.localStorage.setItem("tabi-currency", next);
  }

  const fmt: Fmt = useCallback(
    (amountJpy: number) => formatMoney(amountJpy, currency, rates),
    [currency, rates]
  );

  const summary = useMemo(() => (data ? summarize(data.expenses) : null), [data]);

  async function addExpense(expense: NewExpense) {
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expense),
    });
    if (!res.ok) throw new Error();
    const saved = await res.json();
    setData((d) => (d ? { ...d, expenses: [...d.expenses, saved] } : d));
  }

  async function deleteExpense(id: string) {
    const prev = data;
    setData((d) => (d ? { ...d, expenses: d.expenses.filter((e) => e.id !== id) } : d));
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (!res.ok && prev) setData(prev);
  }

  async function renameTraveler(id: TravelerId, name: string) {
    const res = await fetch("/api/travelers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });
    if (!res.ok) throw new Error();
    setData((d) =>
      d
        ? {
            ...d,
            travelers: d.travelers.map((t) => (t.id === id ? { ...t, name } : t)) as TripData["travelers"],
          }
        : d
    );
  }

  return (
    <div className="relative min-h-[100dvh]">
      <BackgroundScene />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <header className="sticky top-0 z-20 border-b border-hairline/60 bg-canvas/70 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-vermilion text-base font-semibold text-white"
              >
                旅
              </span>
              <h1 className="text-base font-semibold tracking-tight">Tabi</h1>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-24 sm:px-6">
          {loadError ? (
            <div className="mt-24 rounded-xl border border-hairline bg-surface-1 px-8 py-16 text-center">
              <p className="text-lg font-medium">The ledger did not load.</p>
              <p className="mt-2 text-ink-subtle">Check that the dev server is running, then try again.</p>
              <button
                onClick={load}
                className="mx-auto mt-6 flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-canvas transition-transform hover:bg-white active:scale-[0.98]"
              >
                <ArrowsClockwise size={15} weight="bold" aria-hidden />
                Try again
              </button>
            </div>
          ) : !data || !summary ? (
            <LoadingSkeleton />
          ) : (
            <>
              <CombinedPanel data={data} summary={summary} fmt={fmt} reduce={!!reduce} />
              <div className="mt-8">
                <Ledger
                  data={data}
                  summary={summary}
                  fmt={fmt}
                  onDelete={deleteExpense}
                  onRename={renameTraveler}
                />
              </div>
            </>
          )}
        </main>

        <footer className="border-t border-hairline/60">
          <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 py-6 text-sm text-ink-subtle sm:px-6">
            <span>Tabi, a two-person ledger for the Japan trip</span>
            <span className="font-mono" aria-hidden>
              旅費
            </span>
          </div>
        </footer>
      </div>

      <FloatingControls
        currency={currency}
        onSwitch={switchCurrency}
        onAdd={() => setModalOpen(true)}
        reduce={!!reduce}
      />

      <AnimatePresence>
        {modalOpen && data && (
          <ExpenseModal data={data} onClose={() => setModalOpen(false)} onSubmit={addExpense} />
        )}
      </AnimatePresence>
    </div>
  );
}

function FloatingControls({
  currency,
  onSwitch,
  onAdd,
  reduce,
}: {
  currency: Currency;
  onSwitch: (c: Currency) => void;
  onAdd: () => void;
  reduce: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const active = CURRENCIES.find((c) => c.code === currency)!;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden />
      )}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col items-center gap-3">
        <motion.div
          initial={false}
          animate={{ height: open ? 144 : 48 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 340, damping: 28 }}
          role="group"
          aria-label="Display currency"
          className="flex w-12 flex-col justify-end overflow-hidden rounded-3xl border border-hairline bg-surface-2/90 backdrop-blur-md"
        >
          {open ? (
            CURRENCIES.map((c, i) => (
              <motion.button
                key={c.code}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: reduce ? 0 : 0.03 * (CURRENCIES.length - i), ease: [0.16, 1, 0.3, 1] }}
                onClick={() => {
                  onSwitch(c.code);
                  setOpen(false);
                }}
                aria-label={c.label}
                aria-pressed={currency === c.code}
                title={c.label}
                className={`flex h-12 w-12 shrink-0 items-center justify-center font-mono text-base transition-colors active:scale-[0.95] ${
                  currency === c.code
                    ? "bg-surface-3 text-ink"
                    : "text-ink-subtle hover:text-ink"
                }`}
              >
                {c.symbol}
              </motion.button>
            ))
          ) : (
            <motion.button
              key="trigger"
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(true)}
              aria-expanded={false}
              aria-label={`Display currency: ${active.label}. Tap to change`}
              title="Change display currency"
              className="flex h-12 w-12 shrink-0 items-center justify-center font-mono text-base text-ink-muted transition-colors hover:text-ink active:scale-[0.95]"
            >
              {active.symbol}
            </motion.button>
          )}
        </motion.div>
        <button
          onClick={onAdd}
          aria-label="Add expense"
          title="Add expense"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-vermilion text-canvas transition-all hover:bg-vermilion-hover active:scale-[0.95]"
        >
          <Plus size={22} weight="bold" aria-hidden />
        </button>
      </div>
    </>
  );
}

function CombinedPanel({
  data,
  summary,
  fmt,
  reduce,
}: {
  data: TripData;
  summary: ReturnType<typeof summarize>;
  fmt: Fmt;
  reduce: boolean;
}) {
  const stats = trackingStats(data.expenses, summary.total);
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Combined spending"
      className="mt-10 rounded-2xl border border-hairline bg-surface-1/65 p-6 backdrop-blur-xl sm:p-8"
    >
      <div className="grid grid-cols-1 items-end gap-8 lg:grid-cols-2">
        <div>
          <p className="text-sm text-ink-subtle">Spent together so far</p>
          <p className="mt-2 font-mono text-5xl tracking-tight sm:text-6xl">{fmt(summary.total)}</p>
        </div>
        <div className="grid grid-cols-3 gap-4 border-t border-hairline pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div>
            <p className="text-xs text-ink-subtle">Today</p>
            <p className="mt-1 font-mono text-lg">{fmt(stats.todayTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-subtle">Per day</p>
            <p className="mt-1 font-mono text-lg">{fmt(stats.dailyAverage)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-subtle">Days logged</p>
            <p className="mt-1 font-mono text-lg">{stats.daysLogged}</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse" aria-label="Loading" role="status">
      <div className="mt-10 h-40 rounded-2xl bg-surface-1" />
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="h-48 rounded-xl bg-surface-1" />
        <div className="h-48 rounded-xl bg-surface-1" />
      </div>
      <div className="mt-16 h-72 rounded-2xl bg-surface-1" />
    </div>
  );
}
