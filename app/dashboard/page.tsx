"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase, type EventRow } from "@/lib/supabase";
import { BarChart } from "@/components/BarChart";
import { avgFeedIntervalMinutes, bucketByDay } from "@/lib/stats";
import { elapsedLabel } from "@/lib/time";

const fmtOz = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

export default function DashboardPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 14);
      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .gte("logged_at", since.toISOString())
          .order("logged_at", { ascending: false });
        if (error) throw error;
        if (active) setEvents((data ?? []) as EventRow[]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (active) setErr(msg);
      } finally {
        if (active) setLoading(false);
      }
    })();

    const channel = supabase
      .channel("events-dashboard")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "events" }, (payload) => {
        setEvents((prev) => [payload.new as EventRow, ...prev]);
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const days7 = useMemo(() => bucketByDay(events, 7), [events]);
  const today = days7[days7.length - 1];
  const avgInterval = useMemo(() => avgFeedIntervalMinutes(events), [events]);

  const totals = useMemo(() => {
    const feeds = events.filter((e) => e.event_type === "feed");
    const totalOz = feeds.reduce((s, e) => s + (e.quantity_oz ?? 0), 0);
    return {
      feeds: feeds.length,
      totalOz,
      diapers: events.filter((e) => e.event_type === "diaper").length,
    };
  }, [events]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-10 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <div className="text-3xl font-bold">Stats</div>
          <div className="text-sm text-neutral-400">Last 14 days</div>
        </div>
        <div className="flex gap-3">
          <Link href="/log" className="text-sm px-4 py-2 rounded-full border border-neutral-700">
            Log
          </Link>
          <Link href="/display" className="text-sm px-4 py-2 rounded-full border border-neutral-700">
            Display
          </Link>
        </div>
      </header>

      {loading && <div className="text-neutral-500">Loading…</div>}
      {err && (
        <div className="bg-rose-950/40 border border-rose-800 rounded-2xl p-4 mb-6 text-rose-200 text-sm">
          Couldn&apos;t load events: {err}. Check Supabase env vars.
        </div>
      )}

      {!loading && !err && (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Tile label="Today feeds" value={`${today?.feedCount ?? 0}`} sub={`${fmtOz(today?.totalOz ?? 0)} oz`} />
            <Tile label="Today diapers" value={`${today?.diaperCount ?? 0}`} sub={`${today?.wet ?? 0}W ${today?.dirty ?? 0}D ${today?.both ?? 0}B`} />
            <Tile
              label="Avg feed gap"
              value={avgInterval == null ? "—" : `${Math.floor(avgInterval / 60)}h ${avgInterval % 60}m`}
              sub="across last 14d"
            />
            <Tile label="14d totals" value={`${totals.feeds} feeds`} sub={`${fmtOz(totals.totalOz)} oz · ${totals.diapers} diapers`} />
          </section>

          <section className="bg-neutral-900 rounded-3xl p-6 mb-6">
            <div className="text-sm text-neutral-400 mb-3">Feeds per day (last 7)</div>
            <BarChart
              data={days7.map((d) => ({ label: d.label.split(" ")[0], value: d.feedCount }))}
              color="emerald"
            />
          </section>

          <section className="bg-neutral-900 rounded-3xl p-6 mb-6">
            <div className="text-sm text-neutral-400 mb-3">Oz per day (last 7)</div>
            <BarChart
              data={days7.map((d) => ({ label: d.label.split(" ")[0], value: Math.round(d.totalOz * 10) / 10 }))}
              color="emerald"
              suffix="oz"
            />
          </section>

          <section className="bg-neutral-900 rounded-3xl p-6 mb-6">
            <div className="text-sm text-neutral-400 mb-3">Diapers per day (last 7)</div>
            <BarChart
              data={days7.map((d) => ({ label: d.label.split(" ")[0], value: d.diaperCount }))}
              color="sky"
            />
          </section>

          <section className="bg-neutral-900 rounded-3xl p-6">
            <div className="text-sm text-neutral-400 mb-3">Recent events</div>
            <div className="divide-y divide-neutral-800">
              {events.slice(0, 25).map((e) => (
                <div key={e.id} className="flex items-center gap-3 py-2 text-sm">
                  <span
                    className={`w-2 h-2 rounded-full ${e.event_type === "feed" ? "bg-emerald-400" : "bg-sky-400"}`}
                  />
                  <span className="font-medium">
                    {e.event_type === "feed"
                      ? `${fmtOz(e.quantity_oz ?? 0)} oz feed`
                      : `${e.subtype} diaper`}
                  </span>
                  <span className="text-neutral-500 ml-auto">{e.logged_by}</span>
                  <span className="text-neutral-500 w-24 text-right tabular-nums">
                    {elapsedLabel(new Date(e.logged_at))}
                  </span>
                </div>
              ))}
              {events.length === 0 && <div className="text-neutral-500 py-2">No events yet.</div>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-neutral-900 rounded-2xl p-4">
      <div className="text-xs uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-neutral-400 mt-1">{sub}</div>}
    </div>
  );
}
