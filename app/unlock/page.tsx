"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function UnlockPage() {
  return (
    <Suspense fallback={null}>
      <UnlockForm />
    </Suspense>
  );
}

function UnlockForm() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/display";
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwd || busy) return;
    setBusy(true);
    setErr(false);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      if (res.ok) {
        window.location.replace(next);
        return;
      }
      setErr(true);
      setPwd("");
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="text-3xl font-bold tracking-tight mb-1">AraTrack</div>
        <div className="text-sm text-neutral-400 mb-6">Household password</div>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          inputMode="text"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="••••••••"
          className="w-full h-14 px-4 rounded-2xl bg-neutral-900 border border-neutral-800 focus:border-emerald-400 outline-none text-lg"
        />
        {err && (
          <div className="text-rose-400 text-sm mt-3">That wasn&apos;t right. Try again.</div>
        )}
        <button
          type="submit"
          disabled={busy || !pwd}
          className="w-full h-14 mt-4 rounded-2xl bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-semibold text-lg"
        >
          {busy ? "Unlocking…" : "Unlock"}
        </button>
        <div className="text-xs text-neutral-500 mt-6 text-center">
          Stays unlocked on this device for 60 days.
        </div>
      </form>
    </div>
  );
}
