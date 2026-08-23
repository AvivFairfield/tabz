"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import { Backspace } from "@phosphor-icons/react";

const BackgroundScene = dynamic(() => import("@/components/three/BackgroundScene"), {
  ssr: false,
});

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"] as const;

export default function PinPage() {
  const reduce = useReducedMotion();
  const [digits, setDigits] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "wrong" | "ok">("idle");
  const [shake, setShake] = useState(0);

  const submit = useCallback(async (pin: string) => {
    setStatus("checking");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) throw new Error();
      setStatus("ok");
      // full navigation so the new cookie is sent with the next request
      window.location.replace("/");
    } catch {
      setStatus("wrong");
      setShake((n) => n + 1);
      setTimeout(() => {
        setDigits("");
        setStatus("idle");
      }, 650);
    }
  }, []);

  const press = useCallback(
    (key: string) => {
      if (status === "checking" || status === "ok") return;
      if (key === "back") {
        setDigits((d) => d.slice(0, -1));
        return;
      }
      if (!/^\d$/.test(key)) return;
      setDigits((d) => {
        if (d.length >= 4) return d;
        const next = d + key;
        if (next.length === 4) submit(next);
        return next;
      });
    },
    [status, submit]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Backspace") press("back");
      else if (/^\d$/.test(e.key)) press(e.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  return (
    <div className="relative min-h-[100dvh]">
      <BackgroundScene />
      <main className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-vermilion text-lg font-semibold text-white"
          >
            旅
          </span>
          <h1 className="text-lg font-semibold tracking-tight">Tabz</h1>
        </div>

        <p className="mt-10 text-sm text-ink-subtle" id="pin-label">
          Enter the 4-digit PIN
        </p>

        <motion.div
          key={shake}
          animate={reduce || shake === 0 ? { x: 0 } : { x: [0, -10, 10, -8, 8, -4, 4, 0] }}
          transition={{ duration: 0.45 }}
          role="group"
          aria-labelledby="pin-label"
          aria-live="polite"
          className="mt-5 flex gap-4"
        >
          {[0, 1, 2, 3].map((i) => {
            const filled = i < digits.length;
            return (
              <span
                key={i}
                className={`h-4 w-4 rounded-full border transition-all ${
                  status === "wrong"
                    ? "border-vermilion bg-vermilion/30"
                    : filled
                      ? "scale-110 border-vermilion bg-vermilion"
                      : "border-hairline-strong bg-surface-1"
                }`}
              />
            );
          })}
        </motion.div>

        <p className="mt-4 h-5 text-sm text-vermilion" role="alert">
          {status === "wrong" ? "Wrong PIN, try again." : status === "checking" ? "" : ""}
        </p>

        <div className="mt-6 grid w-full max-w-[280px] grid-cols-3 gap-3">
          {KEYS.map((key) =>
            key === "" ? (
              <span key="spacer" aria-hidden />
            ) : (
              <button
                key={key}
                onClick={() => press(key)}
                disabled={status === "checking" || status === "ok"}
                aria-label={key === "back" ? "Delete last digit" : key}
                className="flex h-16 items-center justify-center rounded-xl border border-hairline bg-surface-1/80 font-mono text-2xl text-ink backdrop-blur-sm transition-all hover:bg-surface-2 active:scale-[0.94] disabled:opacity-50"
              >
                {key === "back" ? <Backspace size={24} weight="bold" aria-hidden /> : key}
              </button>
            )
          )}
        </div>

        <p className="mt-8 text-xs text-ink-faint">Stays signed in on this device for 3 months.</p>
      </main>
    </div>
  );
}
