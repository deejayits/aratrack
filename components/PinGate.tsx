"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "aratrack.unlocked";

export function PinGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [entered, setEntered] = useState("");
  const [err, setErr] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY) === "1") setUnlocked(true);
    setReady(true);
  }, []);

  useEffect(() => {
    if (entered.length !== 4) return;
    const expected = process.env.NEXT_PUBLIC_FAMILY_PIN ?? "1234";
    if (entered === expected) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
    } else {
      setErr(true);
      setTimeout(() => {
        setErr(false);
        setEntered("");
      }, 600);
    }
  }, [entered]);

  if (!ready) return null;
  if (unlocked) return <>{children}</>;

  const press = (d: string) => {
    if (d === "del") setEntered((e) => e.slice(0, -1));
    else if (entered.length < 4) setEntered((e) => e + d);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-neutral-950 text-neutral-100">
      <div className="text-3xl font-semibold mb-2">AraTrack</div>
      <div className="text-sm text-neutral-400 mb-8">Enter family PIN</div>
      <div className={`flex gap-3 mb-10 ${err ? "animate-pulse" : ""}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full ${
              entered.length > i ? (err ? "bg-red-500" : "bg-neutral-100") : "bg-neutral-800"
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className="h-16 rounded-xl bg-neutral-900 active:bg-neutral-800 text-2xl font-medium"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => press("0")}
          className="h-16 rounded-xl bg-neutral-900 active:bg-neutral-800 text-2xl font-medium"
        >
          0
        </button>
        <button
          onClick={() => press("del")}
          className="h-16 rounded-xl bg-neutral-900 active:bg-neutral-800 text-sm text-neutral-400"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
