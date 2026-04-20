import { supabase } from "./supabase";

const QUEUE_KEY = "aratrack.queue.v1";

export type QueuedEvent = {
  id: string;
  event_type: "feed" | "diaper";
  subtype?: "wet" | "dirty" | "both" | null;
  quantity_oz?: number | null;
  logged_at: string;
  logged_by: string;
};

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function makeEvent(partial: Omit<QueuedEvent, "id" | "logged_at"> & { logged_at?: string }): QueuedEvent {
  return {
    id: uuid(),
    logged_at: partial.logged_at ?? new Date().toISOString(),
    subtype: partial.subtype ?? null,
    quantity_oz: partial.quantity_oz ?? null,
    event_type: partial.event_type,
    logged_by: partial.logged_by,
  };
}

function readQueue(): QueuedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedEvent[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  window.dispatchEvent(new Event("aratrack.queue"));
}

export function queueSize(): number {
  return readQueue().length;
}

export async function submitEvent(e: QueuedEvent): Promise<{ ok: boolean; queued: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("events").upsert(e, { onConflict: "id" });
    if (error) throw error;
    return { ok: true, queued: false };
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    if (offline || /fetch/i.test(msg) || /ERR_CONNECTION/i.test(msg) || /NetworkError/i.test(msg)) {
      const q = readQueue();
      q.push(e);
      writeQueue(q);
      return { ok: true, queued: true };
    }
    return { ok: false, queued: false, error: msg };
  }
}

export async function flushQueue(): Promise<number> {
  const q = readQueue();
  if (q.length === 0) return 0;
  const remaining: QueuedEvent[] = [];
  let sent = 0;
  for (const e of q) {
    try {
      const { error } = await supabase.from("events").upsert(e, { onConflict: "id" });
      if (error) remaining.push(e);
      else sent += 1;
    } catch {
      remaining.push(e);
    }
  }
  writeQueue(remaining);
  return sent;
}

export async function deleteEvent(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
