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
  const fill = color === "sky" ? "#38bdf8" : "#34d399";
  const barW = 100 / data.length;
  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 30);
          const x = i * barW + barW * 0.15;
          const w = barW * 0.7;
          const y = height - 20 - h;
          return (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} rx={0.8} fill={fill} opacity={0.85} />
              {d.value > 0 && (
                <text
                  x={x + w / 2}
                  y={y - 3}
                  textAnchor="middle"
                  fill="#d4d4d4"
                  fontSize={3.5}
                  fontWeight={600}
                >
                  {d.value}
                  {suffix}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="grid text-xs text-neutral-500" style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)` }}>
        {data.map((d, i) => (
          <div key={i} className="text-center truncate px-0.5">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
