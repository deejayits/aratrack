export function elapsedLabel(from: Date, now: Date = new Date()): string {
  const diffMs = Math.max(0, now.getTime() - from.getTime());
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours < 24) return rem ? `${hours}h ${rem}m ago` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function clockLabel(now: Date = new Date()): string {
  return now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
