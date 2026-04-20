"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CaregiverPill } from "@/components/CaregiverPill";
import { supabase } from "@/lib/supabase";
import type { Caregiver } from "@/lib/constants";

const CAREGIVER_KEY = "aratrack.caregiver";
const round1 = (n: number) => Math.round(n * 10) / 10;
const fmtOz = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

export default function LogPage() {
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null);
  const [oz, setOz] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(CAREGIVER_KEY) as Caregiver | null;
    if (saved) setCaregiver(saved);
  }, []);

  const pickCaregiver = (c: Caregiver | null) => {
    if (c) localStorage.setItem(CAREGIVER_KEY, c);
    else localStorage.removeItem(CAREGIVER_KEY);
    setCaregiver(c);
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const handleError = (err: unknown) => {
    let msg = "Unknown error";
    if (err instanceof Error) msg = err.message;
    else if (typeof err === "string") msg = err;
    else if (err && typeof err === "object" && "message" in err) {
      msg = String((err as { message: unknown }).message);
    }
    if (/fetch/i.test(msg) || /ERR_CONNECTION/i.test(msg) || /NetworkError/i.test(msg)) {
      flash("Can't reach Supabase — check .env.local + restart dev");
    } else {
      flash(`Error: ${msg}`);
    }
  };

  const logFeed = async () => {
    if (!caregiver || oz <= 0 || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("events").insert({
        event_type: "feed",
        quantity_oz: oz,
        logged_by: caregiver,
      });
      if (error) throw error;
      flash(`Logged ${fmtOz(oz)} oz feed`);
      setOz(0);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const logDiaper = async (subtype: "wet" | "dirty" | "both") => {
    if (!caregiver || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("events").insert({
        event_type: "diaper",
        subtype,
        logged_by: caregiver,
      });
      if (error) throw error;
      flash(`Logged ${subtype} diaper`);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-neutral-950 text-neutral-100">
      <div className="w-full max-w-md mx-auto px-4 pt-3 pb-24 safe-pb">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold tracking-tight">AraTrack</span>
          <div className="flex gap-4 text-sm text-neutral-500">
            <Link href="/dashboard" className="hover:text-neutral-200">stats</Link>
            <Link href="/display" className="hover:text-neutral-200">display</Link>
          </div>
        </div>
        <CaregiverPill value={caregiver} onChange={pickCaregiver} />
        {caregiver && (
          <div className="flex flex-col gap-5">
          <section className="bg-neutral-900 rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-4">Feed</h2>
            <div className="flex items-end justify-center gap-2 mb-4">
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                value={oz === 0 ? "" : oz}
                onChange={(e) => setOz(Math.max(0, round1(parseFloat(e.target.value || "0") || 0)))}
                placeholder="0"
                className="w-40 text-center text-5xl font-semibold bg-transparent outline-none border-b-2 border-neutral-700 focus:border-emerald-400 pb-1"
              />
              <span className="text-2xl text-neutral-400 pb-2">oz</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[0.5, 1, 2].map((n) => (
                <button
                  key={n}
                  onClick={() => setOz((o) => round1(o + n))}
                  className="h-12 rounded-xl bg-neutral-800 active:bg-neutral-700 text-lg font-medium"
                >
                  +{fmtOz(n)}
                </button>
              ))}
            </div>
            <button
              onClick={logFeed}
              disabled={oz <= 0 || busy}
              className="w-full h-16 rounded-2xl bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-semibold text-lg active:bg-emerald-400"
            >
              Log Feed
            </button>
          </section>

          <section className="bg-neutral-900 rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-4">Diaper</h2>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => logDiaper("wet")}
                disabled={busy}
                className="h-24 rounded-2xl bg-sky-500 active:bg-sky-400 text-black font-semibold text-lg"
              >
                Wet
              </button>
              <button
                onClick={() => logDiaper("dirty")}
                disabled={busy}
                className="h-24 rounded-2xl bg-amber-600 active:bg-amber-500 text-black font-semibold text-lg"
              >
                Dirty
              </button>
              <button
                onClick={() => logDiaper("both")}
                disabled={busy}
                className="h-24 rounded-2xl bg-rose-500 active:bg-rose-400 text-black font-semibold text-lg"
              >
                Both
              </button>
            </div>
          </section>
          </div>
        )}
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-5 py-3 rounded-full text-sm font-semibold success-flash max-w-[90vw] text-center">
          {toast}
        </div>
      )}
    </div>
  );
}
