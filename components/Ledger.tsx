"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ArrowsLeftRight, Check, PencilSimple, Trash } from "@phosphor-icons/react";
import type { Expense, Traveler, TravelerId, TripData } from "@/lib/types";
import { CATEGORY_LABELS, withAlpha } from "@/lib/types";
import { formatDate, type TripSummary, type CategoryTotal } from "@/lib/format";
import type { Fmt } from "./Dashboard";

export default function Ledger({
  data,
  summary,
  fmt,
  onDelete,
  onEdit,
  onRename,
}: {
  data: TripData;
  summary: TripSummary;
  fmt: Fmt;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
  onRename: (id: TravelerId, name: string) => Promise<void>;
}) {
  const reduce = useReducedMotion();
  const [a, b] = data.travelers;
  // below lg only one person's panel shows; remembered per device
  const [mobileView, setMobileView] = useState<TravelerId>("a");

  useEffect(() => {
    const saved = window.localStorage.getItem("tabi-mobile-person");
    if (saved === "a" || saved === "b") setMobileView(saved);
  }, []);

  // swaps counts taps and drives the button spin
  const [swaps, setSwaps] = useState(0);
  const desktop = useIsDesktop();
  // one slot per traveler: during the exit animation both panels are mounted,
  // and a shared ref would get nulled by the outgoing one's unmount
  const panelRefs = useRef<Record<TravelerId, HTMLDivElement | null>>({ a: null, b: null });
  // size of the outgoing panel, so petals can spawn across its whole face
  const [petalArea, setPetalArea] = useState<{ w: number; h: number; id: number } | null>(null);

  useEffect(() => {
    if (!petalArea) return;
    const t = setTimeout(() => setPetalArea(null), 2400);
    return () => clearTimeout(t);
  }, [petalArea]);

  function swapMobileView() {
    const next: TravelerId = mobileView === "a" ? "b" : "a";
    const el = panelRefs.current[mobileView];
    if (!reduce && desktop === false && el) {
      setPetalArea({ w: el.offsetWidth, h: el.offsetHeight, id: swaps + 1 });
    }
    setSwaps((n) => n + 1);
    setMobileView(next);
    window.localStorage.setItem("tabi-mobile-person", next);
  }

  const shown = mobileView === "a" ? a : b;
  const hiddenOne = mobileView === "a" ? b : a;

  const panelFor = (id: TravelerId) => (
    <PersonPanel
      traveler={id === "a" ? a : b}
      expenses={data.expenses.filter((e) => e.payerId === id)}
      total={summary.spentBy[id]}
      categories={summary.categoriesBy[id]}
      fmt={fmt}
      reduce={!!reduce}
      onDelete={onDelete}
      onEdit={onEdit}
      onRename={onRename}
    />
  );

  return (
    <section aria-label="Travelers" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="relative justify-self-center lg:hidden">
        <motion.button
          onClick={swapMobileView}
          aria-label={`Showing ${shown.name}. Switch to ${hiddenOne.name}`}
          title={`Switch to ${hiddenOne.name}`}
          animate={{ rotate: reduce ? 0 : swaps * 180 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          whileTap={{ scale: 0.88 }}
          className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface-1 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ArrowsLeftRight size={18} weight="bold" aria-hidden />
        </motion.button>
      </div>

      {desktop === false ? (
        // mobile: one panel at a time; the outgoing one wipes away into sakura petals
        <div className="relative">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={mobileView}
              ref={(el) => {
                panelRefs.current[mobileView] = el;
              }}
              initial={swaps === 0 ? false : reduce ? { opacity: 0 } : { opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1, "--wipe": "-20%" } as never}
              exit={
                (reduce
                  ? { opacity: 0, transition: { duration: 0.15 } }
                  : {
                      "--wipe": "120%",
                      transition: { duration: SWEEP_SECONDS, ease: "linear" },
                    }) as never
              }
              // hanko stamp: once the old panel has dissolved, the new one presses
              // in with a snap (opacity lands before the scale settles)
              transition={{
                type: "spring",
                stiffness: 520,
                damping: 30,
                delay: reduce ? 0 : STAMP_DELAY,
                opacity: { duration: 0.12, delay: reduce ? 0 : STAMP_DELAY },
              }}
              style={
                {
                  "--wipe": "-20%",
                  WebkitMaskImage:
                    "linear-gradient(to right, transparent var(--wipe), black calc(var(--wipe) + 18%))",
                  maskImage:
                    "linear-gradient(to right, transparent var(--wipe), black calc(var(--wipe) + 18%))",
                } as never
              }
            >
              {panelFor(mobileView)}
            </motion.div>
          </AnimatePresence>
          {petalArea && (
            <PetalDissolve key={`petals-${petalArea.id}`} width={petalArea.w} height={petalArea.h} />
          )}
          {swaps > 0 && !reduce && <StampRing key={`stamp-${swaps}`} />}
        </div>
      ) : (
        <>
          <div className={mobileView === "a" ? "" : "hidden lg:block"}>{panelFor("a")}</div>
          <div className={mobileView === "b" ? "" : "hidden lg:block"}>{panelFor("b")}</div>
        </>
      )}
    </section>
  );
}

/** null until mounted (SSR-safe), then tracks the lg breakpoint */
function useIsDesktop() {
  const [desktop, setDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

/** How long the left-to-right wipe takes; petals spawn along its front. */
const SWEEP_SECONDS = 0.9;
/** When the incoming panel stamps in: just after the wipe has finished. */
const STAMP_DELAY = SWEEP_SECONDS + 0.08;

/** Vermilion ring that flashes around the panel's edge as it stamps in. */
function StampRing() {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 1 }}
      animate={{ opacity: [0, 0.9, 0], scale: [1, 1, 1.05] }}
      transition={{ duration: 0.55, delay: STAMP_DELAY, times: [0, 0.15, 1], ease: "easeOut" }}
      className="pointer-events-none absolute inset-0 z-10 rounded-xl border-2 border-vermilion"
    />
  );
}
const PETAL_TINTS = ["#eba0b3", "#f3b6c6", "#e28aa3", "#f7cad6"];

/**
 * The outgoing panel's face scattering into sakura petals: each petal is
 * born where the wipe front passes (delay follows its x position), then
 * tumbles up and to the right on the wind and fades.
 */
function PetalDissolve({ width, height }: { width: number; height: number }) {
  // rolled once per mount: re-rolling on re-render would retarget petals mid-flight
  const [petals] = useState(() => {
    const count = Math.min(140, Math.max(50, Math.round((width * height) / 900)));
    return Array.from({ length: count }, (_, i) => {
      const fx = Math.random();
      return {
        id: i,
        left: fx * width,
        top: Math.random() * height,
        delay: fx * SWEEP_SECONDS * 0.95,
        dx: 40 + Math.random() * 120,
        dy: -(40 + Math.random() * 140),
        spin: (Math.random() < 0.5 ? -1 : 1) * (240 + Math.random() * 360),
        size: 7 + Math.random() * 6,
        tint: PETAL_TINTS[i % PETAL_TINTS.length],
      };
    });
  });

  return (
    <div className="pointer-events-none absolute left-0 top-0 z-10 overflow-visible" aria-hidden>
      {petals.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 1, 0], x: p.dx, y: p.dy, rotate: p.spin, scale: 1 }}
          transition={{
            // one continuous decelerating flight: a mid-keyframe with per-segment
            // easing made petals park at the waypoint, which read as "waiting"
            duration: 1.3,
            delay: p.delay,
            ease: [0.25, 0.9, 0.4, 1],
            opacity: { duration: 1.3, delay: p.delay, times: [0, 0.08, 0.55, 1], ease: "linear" },
          }}
          style={{
            position: "absolute",
            left: p.left,
            top: p.top,
            width: p.size * 0.7,
            height: p.size,
            backgroundColor: p.tint,
            borderRadius: "100% 0 100% 0",
          }}
        />
      ))}
    </div>
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
  onEdit,
  onRename,
}: {
  traveler: Traveler;
  expenses: Expense[];
  total: number;
  categories: CategoryTotal[];
  fmt: Fmt;
  reduce: boolean;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
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
                  <span className="mr-1.5" style={{ color: CATEGORY_LABELS[category].color }} aria-hidden>
                    {CATEGORY_LABELS[category].kanji}
                  </span>
                  {CATEGORY_LABELS[category].label}
                </span>
                <span className="font-mono">{fmt(catTotal)}</span>
              </div>
              <div
                className="mt-1.5 h-0.5 rounded-full"
                style={{
                  width: `${Math.max(share * 100, 3)}%`,
                  background: withAlpha(CATEGORY_LABELS[category].color, 0.75),
                }}
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
              <ExpenseRow
                key={e.id}
                expense={e}
                fmt={fmt}
                reduce={reduce}
                onDelete={() => onDelete(e.id)}
                onEdit={() => onEdit(e)}
              />
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
  onEdit,
}: {
  expense: Expense;
  fmt: Fmt;
  reduce: boolean;
  onDelete: () => void;
  onEdit: () => void;
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
      style={{ backgroundColor: withAlpha(cat.color, 0.06) }}
      className="group flex items-center gap-3 px-2 py-1 sm:px-3"
    >
      <button
        onClick={onEdit}
        aria-label={`Edit ${expense.title}`}
        title="Edit"
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 sm:px-2"
      >
        <span className="w-14 shrink-0 font-mono text-xs text-ink-faint">
          {formatDate(expense.date)}
        </span>
        <span
          title={cat.label}
          style={{
            color: cat.color,
            borderColor: withAlpha(cat.color, 0.4),
            backgroundColor: withAlpha(cat.color, 0.12),
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded border text-xs"
          aria-label={cat.label}
        >
          {cat.kanji}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{expense.title}</span>
        <span className="font-mono text-sm">{fmt(expense.amount)}</span>
      </button>
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
