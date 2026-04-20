"use client";

import type { EventRow } from "@/lib/supabase";

export function TimelineBar({ events, now }: { events: EventRow[]; now: Date }) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const DAY_MS = 24 * 60 * 60 * 1000;
  const nowPct = ((now.getTime() - start.getTime()) / DAY_MS) * 100;

  const ticks = [0, 6, 12, 18, 24];

  return (
    <div className="w-full">
      <div className="relative h-10 md:h-14 bg-neutral-800/60 rounded-lg overflow-hidden">
        {ticks.slice(1, -1).map((h) => (
          <div
            key={h}
            className="absolute top-0 bottom-0 w-px bg-neutral-700/60"
            style={{ left: `${(h / 24) * 100}%` }}
          />
        ))}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-neutral-300"
          style={{ left: `${nowPct}%` }}
          aria-label="now"
        />
        {events.map((e) => {
          const t = new Date(e.logged_at).getTime();
          const pct = ((t - start.getTime()) / DAY_MS) * 100;
          if (pct < 0 || pct > 100) return null;
          const isFeed = e.event_type === "feed";
          return (
            <div
              key={e.id}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ring-2 ring-neutral-900 ${
                isFeed ? "bg-emerald-400" : "bg-sky-400"
              }`}
              style={{ left: `${pct}%` }}
              title={`${isFeed ? `${e.quantity_oz ?? 0} oz feed` : `${e.subtype} diaper`} · ${new Date(
                e.logged_at,
              ).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[10px] md:text-xs text-neutral-500 tabular-nums">
        <span>12a</span>
        <span>6a</span>
        <span>12p</span>
        <span>6p</span>
        <span>12a</span>
      </div>
    </div>
  );
}
