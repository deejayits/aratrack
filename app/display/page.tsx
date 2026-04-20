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
    <div className="min-h-[100dvh] lg:h-screen w-screen lg:overflow-hidden bg-neutral-950 text-neutral-100 flex flex-col p-4 md:p-6 lg:p-10">
      <header className="flex items-start justify-between mb-4 md:mb-8 gap-3 flex-wrap">
        <div>
          <div className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">AraTrack</div>
          <div className="text-sm md:text-lg lg:text-xl text-neutral-400 mt-0.5 md:mt-1">Aradhya</div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 lg:gap-6 flex-wrap justify-end">
          <button
            onClick={() => {
              setSoundOn((v) => !v);
              if (!soundOn) playAlert();
            }}
            className={`text-xs md:text-base lg:text-lg px-2.5 md:px-4 py-1.5 md:py-2 rounded-full border ${
              soundOn ? "border-emerald-500 text-emerald-400" : "border-neutral-700 text-neutral-500"
            }`}
            aria-label="Toggle alert sound"
          >
            {soundOn ? "🔔 On" : "🔕 Off"}
          </button>
          <Link
            href="/dashboard"
            className="text-xs md:text-base lg:text-lg px-2.5 md:px-4 py-1.5 md:py-2 rounded-full border border-neutral-700 text-neutral-400 hover:text-neutral-100"
          >
            Stats
          </Link>
          <Link
            href="/log"
            className="text-xs md:text-base lg:text-lg px-2.5 md:px-4 py-1.5 md:py-2 rounded-full border border-neutral-700 text-neutral-400 hover:text-neutral-100"
          >
            Log
          </Link>
          <div className="text-3xl md:text-5xl lg:text-6xl font-semibold tabular-nums">{clock}</div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8 lg:flex-1 lg:min-h-0">
        <section className="bg-neutral-900 rounded-3xl p-5 md:p-8 lg:p-10 flex flex-col">
          <div className="text-base md:text-xl lg:text-2xl text-neutral-400 mb-2 md:mb-3">Last Feed</div>
          {lastFeed ? (
            <>
              <div className={`text-4xl md:text-6xl lg:text-7xl font-bold ${toneText[feedTone]}`}>
                {elapsedLabel(new Date(lastFeed.logged_at), now)}
              </div>
              <div className="text-2xl md:text-3xl lg:text-4xl mt-2 md:mt-4">{fmtOz(lastFeed.quantity_oz ?? 0)} oz</div>
              <div className="text-base md:text-xl lg:text-2xl text-neutral-400 mt-1 md:mt-2">
                by {lastFeed.logged_by}
              </div>
              <div className="mt-4 lg:mt-auto">
                <div className="flex justify-between items-center text-sm md:text-lg lg:text-xl text-neutral-400 mb-2">
                  <span className="flex items-center gap-2">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${toneBar[feedTone]}`}
                      aria-hidden
                    />
                    {feedTone === "red"
                      ? "Overdue"
                      : feedTone === "amber"
                        ? "Soon"
                        : feedTone === "green"
                          ? "On track"
                          : "No data"}
                  </span>
                  <span className="tabular-nums">
                    {feedAgoMin ?? 0}m / {FEED_INTERVAL_MINUTES}m
                  </span>
                </div>
                <div className="w-full h-3 md:h-5 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className={`h-full ${toneBar[feedTone]} transition-all duration-500`}
                    style={{ width: `${feedPct}%` }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-2xl md:text-4xl text-neutral-500">No feeds yet</div>
          )}
        </section>

        <section className="bg-neutral-900 rounded-3xl p-5 md:p-8 lg:p-10 flex flex-col">
          <div className="text-base md:text-xl lg:text-2xl text-neutral-400 mb-2 md:mb-3">Last Diaper</div>
          {lastDiaper ? (
            <>
              <div className="text-4xl md:text-6xl lg:text-7xl font-bold text-sky-300">
                {elapsedLabel(new Date(lastDiaper.logged_at), now)}
              </div>
              <div className="text-2xl md:text-3xl lg:text-4xl mt-2 md:mt-4 capitalize">{lastDiaper.subtype}</div>
              <div className="text-base md:text-xl lg:text-2xl text-neutral-400 mt-1 md:mt-2">
                by {lastDiaper.logged_by}
              </div>
            </>
          ) : (
            <div className="text-2xl md:text-4xl text-neutral-500">No diapers yet</div>
          )}
        </section>
      </div>

      <section className="mt-4 md:mt-6 lg:mt-8 bg-neutral-900 rounded-3xl p-4 md:p-6 flex-shrink-0">
        <div className="text-base md:text-xl text-neutral-400 mb-2 md:mb-3">Recent activity</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2">
          {events.slice(0, 8).map((e) => (
            <div key={e.id} className="flex items-center gap-3 text-sm md:text-base lg:text-lg">
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
            <div className="text-neutral-500 md:col-span-2 lg:col-span-4">Nothing logged yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
