"use client";

import { useEffect, useState } from "react";
import { flushQueue, queueSize } from "@/lib/offline";

export function OfflineBadge() {
  const [count, setCount] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setCount(queueSize());
    update();
    window.addEventListener("aratrack.queue", update);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("aratrack.queue", update);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const on = () => {
      setOnline(true);
      flushQueue();
    };
    const off = () => setOnline(false);
    const focus = () => flushQueue();
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("focus", focus);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("focus", focus);
    };
  }, []);

  if (online && count === 0) return null;
  return (
    <div className="fixed top-2 right-2 z-40 text-xs px-3 py-1.5 rounded-full bg-amber-600/20 border border-amber-700 text-amber-200 backdrop-blur">
      {online ? `${count} pending` : count > 0 ? `offline · ${count} pending` : "offline"}
    </div>
  );
}
