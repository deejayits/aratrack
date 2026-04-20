"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CaregiverPill } from "@/components/CaregiverPill";
import { deleteEvent, makeEvent, submitEvent } from "@/lib/offline";
import type { Caregiver } from "@/lib/constants";

const CAREGIVER_KEY = "aratrack.caregiver";
const UNDO_WINDOW_MS = 6000;
const round1 = (n: number) => Math.round(n * 10) / 10;
const fmtOz = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

type Toast = { msg: string; lastId?: string; queued?: boolean };

export default function LogPage() {
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null);
  const [oz, setOz] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(CAREGIVER_KEY) as Caregiver | null;
    if (saved) setCaregiver(saved);
  }, []);

  const pickCaregiver = (c: Caregiver | null) => {
    if (c) localStorage.setItem(CAREGIVER_KEY, c);
    else localStorage.removeItem(CAREGIVER_KEY);
    setCaregiver(c);
  };

  const showToast = (t: Toast, ms = UNDO_WINDOW_MS) => {
    setToast(t);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  };

  const submit = async (event: ReturnType<typeof makeEvent>, label: string) => {
    if (busy) return;
    setBusy(true);
    const res = await submitEvent(event);
    setBusy(false);
    if (!res.ok) {
      showToast({ msg: `Error: ${res.error ?? "unknown"}` }, 3000);
      return;
    }
    showToast({
      msg: res.queued ? `${label} · queued (offline)` : label,
      lastId: res.queued ? undefined : event.id,
      queued: res.queued,
    });
  };

  const logFeed = async () => {
    if (!caregiver || oz <= 0) return;
    const evt = makeEvent({ event_type: "feed", quantity_oz: oz, logged_by: caregiver });
    await submit(evt, `Logged ${fmtOz(oz)} oz feed`);
    setOz(0);
  };

  const logDiaper = async (subtype: "wet" | "dirty" | "both") => {
    if (!caregiver) return;
    const evt = makeEvent({ event_type: "diaper", subtype, logged_by: caregiver });
    await submit(evt, `Logged ${subtype} diaper`);
  };

  const undoLast = async () => {
    if (!toast?.lastId) return;
    const id = toast.lastId;
    setToast(null);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    const res = await deleteEvent(id);
    showToast({ msg: res.ok ? "Undone" : `Couldn't undo: ${res.error}` }, 2000);
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-emerald-500 text-black px-4 py-3 rounded-full text-sm font-semibold success-flash max-w-[90vw] shadow-lg">
          <span className="truncate">{toast.msg}</span>
          {toast.lastId && (
            <button
              onClick={undoLast}
              className="ml-2 px-3 py-1 rounded-full bg-black/20 hover:bg-black/30 text-black text-xs font-semibold"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
