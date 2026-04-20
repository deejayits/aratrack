import type { EventRow } from "./supabase";

export type DayBucket = {
  dayStart: Date;
  key: string;
  label: string;
  feedCount: number;
  totalOz: number;
  diaperCount: number;
  wet: number;
  dirty: number;
  both: number;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function bucketByDay(events: EventRow[], days: number): DayBucket[] {
  const today = startOfDay(new Date());
  const buckets: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(today);
    dayStart.setDate(today.getDate() - i);
    buckets.push({
      dayStart,
      key: dayStart.toISOString().slice(0, 10),
      label: dayStart.toLocaleDateString([], { weekday: "short", month: "numeric", day: "numeric" }),
      feedCount: 0,
      totalOz: 0,
      diaperCount: 0,
      wet: 0,
      dirty: 0,
      both: 0,
    });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const e of events) {
    const k = startOfDay(new Date(e.logged_at)).toISOString().slice(0, 10);
    const b = byKey.get(k);
    if (!b) continue;
    if (e.event_type === "feed") {
      b.feedCount += 1;
      b.totalOz += e.quantity_oz ?? 0;
    } else if (e.event_type === "diaper") {
      b.diaperCount += 1;
      if (e.subtype === "wet") b.wet += 1;
      else if (e.subtype === "dirty") b.dirty += 1;
      else if (e.subtype === "both") b.both += 1;
    }
  }
  return buckets;
}

export function avgFeedIntervalMinutes(events: EventRow[]): number | null {
  const feeds = events
    .filter((e) => e.event_type === "feed")
    .map((e) => new Date(e.logged_at).getTime())
    .sort((a, b) => a - b);
  if (feeds.length < 2) return null;
  const gaps: number[] = [];
  for (let i = 1; i < feeds.length; i++) gaps.push((feeds[i] - feeds[i - 1]) / 60000);
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
}
