"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase, type EventRow } from "@/lib/supabase";
import { BarChart } from "@/components/BarChart";
import { avgFeedIntervalMinutes, bucketByDay, toCsv } from "@/lib/stats";
import { elapsedLabel } from "@/lib/time";
import { deleteEvent } from "@/lib/offline";

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
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "events" }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) setEvents((prev) => prev.filter((e) => e.id !== id));
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id: string) => {
    const prev = events;
    setEvents((cur) => cur.filter((e) => e.id !== id));
    const res = await deleteEvent(id);
    if (!res.ok) setEvents(prev);
  };

  const exportCsv = () => {
    const csv = toCsv(events);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aratrack-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
    <div className="min-h-[100dvh] bg-neutral-950 text-neutral-100 p-4 md:p-8 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6 md:mb-8 gap-3">
        <div>
          <div className="text-2xl md:text-3xl font-bold">Stats</div>
          <div className="text-xs md:text-sm text-neutral-400">Last 14 days</div>
        </div>
        <div className="flex gap-2 md:gap-3 flex-wrap justify-end">
          <button
            onClick={exportCsv}
            disabled={events.length === 0}
            className="text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-neutral-700 disabled:opacity-40"
          >
            ⬇ CSV
          </button>
          <Link href="/log" className="text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-neutral-700">
            Log
          </Link>
          <Link href="/display" className="text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-neutral-700">
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
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <Tile label="Today feeds" value={`${today?.feedCount ?? 0}`} sub={`${fmtOz(today?.totalOz ?? 0)} oz`} />
            <Tile label="Today diapers" value={`${today?.diaperCount ?? 0}`} sub={`${today?.wet ?? 0}W ${today?.dirty ?? 0}D ${today?.both ?? 0}B`} />
            <Tile
              label="Avg feed gap"
              value={avgInterval == null ? "—" : `${Math.floor(avgInterval / 60)}h ${avgInterval % 60}m`}
              sub="across last 14d"
            />
            <Tile label="14d totals" value={`${totals.feeds} feeds`} sub={`${fmtOz(totals.totalOz)} oz · ${totals.diapers} diapers`} />
          </section>

          <section className="bg-neutral-900 rounded-2xl md:rounded-3xl p-4 md:p-6 mb-4 md:mb-6">
            <div className="text-sm text-neutral-400 mb-3">Feeds per day (last 7)</div>
            <BarChart
              data={days7.map((d) => ({ label: d.label.split(" ")[0], value: d.feedCount }))}
              color="emerald"
            />
          </section>

          <section className="bg-neutral-900 rounded-2xl md:rounded-3xl p-4 md:p-6 mb-4 md:mb-6">
            <div className="text-sm text-neutral-400 mb-3">Oz per day (last 7)</div>
            <BarChart
              data={days7.map((d) => ({ label: d.label.split(" ")[0], value: Math.round(d.totalOz * 10) / 10 }))}
              color="emerald"
              suffix="oz"
            />
          </section>

          <section className="bg-neutral-900 rounded-2xl md:rounded-3xl p-4 md:p-6 mb-4 md:mb-6">
            <div className="text-sm text-neutral-400 mb-3">Diapers per day (last 7)</div>
            <BarChart
              data={days7.map((d) => ({ label: d.label.split(" ")[0], value: d.diaperCount }))}
              color="sky"
            />
          </section>

          <section className="bg-neutral-900 rounded-2xl md:rounded-3xl p-4 md:p-6">
            <div className="text-sm text-neutral-400 mb-3">Recent events</div>
            <div className="divide-y divide-neutral-800">
              {events.slice(0, 25).map((e) => (
                <div key={e.id} className="flex items-center gap-3 py-2 text-sm group">
                  <span
                    className={`w-2 h-2 rounded-full ${e.event_type === "feed" ? "bg-emerald-400" : "bg-sky-400"}`}
                  />
                  <span className="font-medium">
                    {e.event_type === "feed"
                      ? `${fmtOz(e.quantity_oz ?? 0)} oz feed`
                      : `${e.subtype} diaper`}
                  </span>
                  <span className="text-neutral-500 ml-auto hidden sm:inline">{e.logged_by}</span>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="text-neutral-600 hover:text-rose-400 px-2 text-xs opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                    aria-label="Delete event"
                    title="Delete"
                  >
                    ×
                  </button>
                  <span className="text-neutral-500 w-20 md:w-24 text-right tabular-nums">
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
    <div className="bg-neutral-900 rounded-2xl p-3 md:p-4">
      <div className="text-[10px] md:text-xs uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="text-xl md:text-3xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-[11px] md:text-xs text-neutral-400 mt-1">{sub}</div>}
    </div>
  );
}
