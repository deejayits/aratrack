"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase, type EventRow } from "@/lib/supabase";
import { FEED_INTERVAL_MINUTES } from "@/lib/constants";
import { clockLabel, elapsedLabel } from "@/lib/time";

const fmtOz = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

function playAlert() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [0, 0.35, 0.7].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.3);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // ignore
  }
}

export default function DisplayPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [now, setNow] = useState<Date>(() => new Date());
  const [clock, setClock] = useState<string>("");
  const [soundOn, setSoundOn] = useState(false);
  const alertedRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("logged_at", { ascending: false })
        .limit(30);
      if (active && data) setEvents(data as EventRow[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("events-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        (payload) => {
          setEvents((prev) => [payload.new as EventRow, ...prev].slice(0, 30));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    setClock(clockLabel());
    const tick = setInterval(() => setClock(clockLabel()), 1000);
    return () => clearInterval(tick);
  }, []);

  const lastFeed = useMemo(() => events.find((e) => e.event_type === "feed"), [events]);
  const lastDiaper = useMemo(() => events.find((e) => e.event_type === "diaper"), [events]);

  const feedAgoMin = lastFeed
    ? Math.floor((now.getTime() - new Date(lastFeed.logged_at).getTime()) / 60000)
    : null;

  const feedPct = feedAgoMin == null ? 0 : Math.min(100, (feedAgoMin / FEED_INTERVAL_MINUTES) * 100);
  const feedTone =
    feedAgoMin == null
      ? "neutral"
      : feedAgoMin < FEED_INTERVAL_MINUTES * 0.7
        ? "green"
        : feedAgoMin < FEED_INTERVAL_MINUTES
          ? "amber"
          : "red";

  const toneBar: Record<string, string> = {
    green: "bg-emerald-500",
    amber: "bg-amber-400",
    red: "bg-rose-500",
    neutral: "bg-neutral-700",
  };
  const toneText: Record<string, string> = {
    green: "text-emerald-400",
    amber: "text-amber-300",
    red: "text-rose-400",
    neutral: "text-neutral-400",
  };

  useEffect(() => {
    if (!soundOn) return;
    if (feedTone !== "red" || !lastFeed) return;
    if (alertedRef.current === lastFeed.id) return;
    alertedRef.current = lastFeed.id;
    playAlert();
  }, [feedTone, lastFeed, soundOn]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 flex flex-col p-10">
      <header className="flex items-baseline justify-between mb-8">
        <div>
          <div className="text-5xl font-bold tracking-tight">AraTrack</div>
          <div className="text-xl text-neutral-400 mt-1">Aradhya</div>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => {
              setSoundOn((v) => !v);
              if (!soundOn) playAlert();
            }}
            className={`text-lg px-4 py-2 rounded-full border ${
              soundOn ? "border-emerald-500 text-emerald-400" : "border-neutral-700 text-neutral-500"
            }`}
            aria-label="Toggle alert sound"
          >
            {soundOn ? "🔔 Alerts on" : "🔕 Alerts off"}
          </button>
          <Link
            href="/dashboard"
            className="text-lg px-4 py-2 rounded-full border border-neutral-700 text-neutral-400 hover:text-neutral-100"
          >
            Stats
          </Link>
          <Link
            href="/log"
            className="text-lg px-4 py-2 rounded-full border border-neutral-700 text-neutral-400 hover:text-neutral-100"
          >
            Log
          </Link>
          <div className="text-6xl font-semibold tabular-nums">{clock}</div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-8 flex-1 min-h-0">
        <section className="bg-neutral-900 rounded-3xl p-10 flex flex-col">
          <div className="text-2xl text-neutral-400 mb-3">Last Feed</div>
          {lastFeed ? (
            <>
              <div className={`text-7xl font-bold ${toneText[feedTone]}`}>
                {elapsedLabel(new Date(lastFeed.logged_at), now)}
              </div>
              <div className="text-4xl mt-4">{fmtOz(lastFeed.quantity_oz ?? 0)} oz</div>
              <div className="text-2xl text-neutral-400 mt-2">
                by {lastFeed.logged_by}
              </div>
              <div className="mt-auto">
                <div className="flex justify-between text-xl text-neutral-400 mb-2">
                  <span>Next feed window</span>
                  <span>
                    {feedAgoMin ?? 0}m / {FEED_INTERVAL_MINUTES}m
                  </span>
                </div>
                <div className="w-full h-5 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className={`h-full ${toneBar[feedTone]} transition-all duration-500`}
                    style={{ width: `${feedPct}%` }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-4xl text-neutral-500">No feeds yet</div>
          )}
        </section>

        <section className="bg-neutral-900 rounded-3xl p-10 flex flex-col">
          <div className="text-2xl text-neutral-400 mb-3">Last Diaper</div>
          {lastDiaper ? (
            <>
              <div className="text-7xl font-bold text-sky-300">
                {elapsedLabel(new Date(lastDiaper.logged_at), now)}
              </div>
              <div className="text-4xl mt-4 capitalize">{lastDiaper.subtype}</div>
              <div className="text-2xl text-neutral-400 mt-2">
                by {lastDiaper.logged_by}
              </div>
            </>
          ) : (
            <div className="text-4xl text-neutral-500">No diapers yet</div>
          )}
        </section>
      </div>

      <section className="mt-8 bg-neutral-900 rounded-3xl p-6 flex-shrink-0">
        <div className="text-xl text-neutral-400 mb-3">Recent activity</div>
        <div className="grid grid-cols-4 gap-x-6 gap-y-2">
          {events.slice(0, 8).map((e) => (
            <div key={e.id} className="flex items-center gap-3 text-lg">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  e.event_type === "feed" ? "bg-emerald-400" : "bg-sky-400"
                }`}
              />
              <span className="font-medium">
                {e.event_type === "feed"
                  ? `${fmtOz(e.quantity_oz ?? 0)} oz feed`
                  : `${e.subtype} diaper`}
              </span>
              <span className="text-neutral-500 ml-auto">{e.logged_by}</span>
              <span className="text-neutral-500 w-24 text-right">
                {elapsedLabel(new Date(e.logged_at), now)}
              </span>
            </div>
          ))}
          {events.length === 0 && (
            <div className="text-neutral-500 col-span-4">Nothing logged yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
