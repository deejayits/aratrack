"use client";

type Datum = { label: string; value: number };

export function BarChart({
  data,
  color = "emerald",
  suffix = "",
  height = 160,
}: {
  data: Datum[];
  color?: "emerald" | "sky";
  suffix?: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const bar = color === "sky" ? "bg-sky-400" : "bg-emerald-400";

  return (
    <div>
      <div className="flex items-end gap-1.5 md:gap-2" style={{ height }}>
        {data.map((d, i) => {
          const pct = Math.max(0, (d.value / max) * 100);
          return (
            <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1 min-w-0">
              {d.value > 0 && (
                <div className="text-[10px] md:text-xs font-semibold text-neutral-200 tabular-nums leading-none">
                  {d.value}
                  {suffix}
                </div>
              )}
              <div
                className={`${bar} w-full rounded-md opacity-90 transition-all duration-500`}
                style={{ height: `${pct}%`, minHeight: d.value > 0 ? 4 : 0 }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 md:gap-2 mt-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] md:text-xs text-neutral-500 truncate min-w-0">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
