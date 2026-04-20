"use client";

import { useEffect, useState } from "react";
import { PinGate } from "@/components/PinGate";
import { CaregiverPill } from "@/components/CaregiverPill";
import { supabase } from "@/lib/supabase";
import type { Caregiver } from "@/lib/constants";

const CAREGIVER_KEY = "aratrack.caregiver";

export default function LogPage() {
  return (
    <PinGate>
      <LogUI />
    </PinGate>
  );
}

function LogUI() {
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null);
  const [ml, setMl] = useState(0);
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
    setTimeout(() => setToast(null), 1400);
  };

  const logFeed = async () => {
    if (!caregiver || ml <= 0 || busy) return;
    setBusy(true);
    const { error } = await supabase.from("events").insert({
      event_type: "feed",
      quantity_ml: ml,
      logged_by: caregiver,
    });
    setBusy(false);
    if (error) {
      flash(`Error: ${error.message}`);
      return;
    }
    flash(`Logged ${ml}ml feed`);
    setMl(0);
  };

  const logDiaper = async (subtype: "wet" | "dirty" | "both") => {
    if (!caregiver || busy) return;
    setBusy(true);
    const { error } = await supabase.from("events").insert({
      event_type: "diaper",
      subtype,
      logged_by: caregiver,
    });
    setBusy(false);
    if (error) {
      flash(`Error: ${error.message}`);
      return;
    }
    flash(`Logged ${subtype} diaper`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100">
      <CaregiverPill value={caregiver} onChange={pickCaregiver} />
      {!caregiver ? null : (
        <div className="flex-1 px-5 pb-10 flex flex-col gap-8">
          <section className="bg-neutral-900 rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-4">Feed</h2>
            <div className="flex items-end justify-center gap-2 mb-4">
              <input
                type="number"
                inputMode="numeric"
                value={ml === 0 ? "" : ml}
                onChange={(e) => setMl(Math.max(0, parseInt(e.target.value || "0", 10) || 0))}
                placeholder="0"
                className="w-40 text-center text-5xl font-semibold bg-transparent outline-none border-b-2 border-neutral-700 focus:border-emerald-400 pb-1"
              />
              <span className="text-2xl text-neutral-400 pb-2">ml</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[10, 20, 30].map((n) => (
                <button
                  key={n}
                  onClick={() => setMl((m) => m + n)}
                  className="h-12 rounded-xl bg-neutral-800 active:bg-neutral-700 text-lg font-medium"
                >
                  +{n}
                </button>
              ))}
            </div>
            <button
              onClick={logFeed}
              disabled={ml <= 0 || busy}
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

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-5 py-3 rounded-full text-sm font-semibold success-flash">
          {toast}
        </div>
      )}
    </div>
  );
}
