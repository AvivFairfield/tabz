"use client";

import { CATEGORY_LABELS, withAlpha } from "@/lib/types";
import type { CategoryTotal } from "@/lib/format";
import type { Fmt } from "./Dashboard";

/*
  Combined-spending pie: slices in fixed category order (adjacency is
  CVD-validated, including the wrap-around), 2px surface gaps between
  slices, identity carried by the legend (kanji + label + amount), never
  by color alone.
*/

const SIZE = 148;
const R = SIZE / 2;

function slicePath(startAngle: number, endAngle: number): string {
  const a0 = startAngle - Math.PI / 2; // start at 12 o'clock
  const a1 = endAngle - Math.PI / 2;
  const x0 = R + R * Math.cos(a0);
  const y0 = R + R * Math.sin(a0);
  const x1 = R + R * Math.cos(a1);
  const y1 = R + R * Math.sin(a1);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${R} ${R} L ${x0} ${y0} A ${R} ${R} 0 ${largeArc} 1 ${x1} ${y1} Z`;
}

export default function CategoryPie({
  categories,
  fmt,
}: {
  categories: CategoryTotal[];
  fmt: Fmt;
}) {
  if (categories.length === 0) {
    return (
      <div className="flex items-center gap-6">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
          <circle
            cx={R}
            cy={R}
            r={R - 1}
            fill="none"
            stroke="var(--color-surface-3)"
            strokeWidth="2"
          />
        </svg>
        <p className="text-sm text-ink-subtle">Nothing logged yet.</p>
      </div>
    );
  }

  let angle = 0;
  const slices = categories.map((c) => {
    const start = angle;
    angle += c.share * Math.PI * 2;
    return { ...c, start, end: angle };
  });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="Spending by category"
        className="shrink-0"
      >
        {slices.length === 1 ? (
          <circle cx={R} cy={R} r={R - 1} fill={CATEGORY_LABELS[slices[0].category].color}>
            <title>{`${CATEGORY_LABELS[slices[0].category].label}: ${fmt(slices[0].total)}`}</title>
          </circle>
        ) : (
          slices.map((s) => (
            <path
              key={s.category}
              d={slicePath(s.start, s.end)}
              fill={CATEGORY_LABELS[s.category].color}
              stroke="var(--color-surface-1)"
              strokeWidth="2"
              strokeLinejoin="round"
              className="transition-opacity hover:opacity-80"
            >
              <title>{`${CATEGORY_LABELS[s.category].label}: ${fmt(s.total)} (${Math.round(s.share * 100)}%)`}</title>
            </path>
          ))
        )}
      </svg>
      <ul className="w-full space-y-1.5">
        {slices.map((s) => {
          const meta = CATEGORY_LABELS[s.category];
          return (
            <li key={s.category} className="flex items-baseline gap-2 text-sm">
              <span
                className="flex h-5 w-5 shrink-0 -translate-y-0.5 items-center justify-center self-center rounded text-[11px]"
                style={{
                  color: meta.color,
                  backgroundColor: withAlpha(meta.color, 0.16),
                }}
                aria-hidden
              >
                {meta.kanji}
              </span>
              <span className="text-ink-muted">{meta.label}</span>
              <span className="ml-auto font-mono text-ink">{fmt(s.total)}</span>
              <span className="w-9 text-right font-mono text-xs text-ink-subtle">
                {Math.round(s.share * 100)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
