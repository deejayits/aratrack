"use client";

import { CAREGIVERS, type Caregiver } from "@/lib/constants";

export function CaregiverPill({
  value,
  onChange,
}: {
  value: Caregiver | null;
  onChange: (c: Caregiver) => void;
}) {
  if (!value) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="text-lg text-neutral-300">Who&apos;s logging?</div>
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {CAREGIVERS.map((c) => (
            <button
              key={c}
              onClick={() => onChange(c)}
              className="h-20 rounded-2xl bg-neutral-900 active:bg-neutral-800 text-xl font-medium"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-3">
      <div className="inline-flex items-center gap-2 bg-neutral-900 rounded-full px-4 py-1.5 text-sm">
        <span className="text-neutral-400">Logging as</span>
        <span className="font-semibold">{value}</span>
        <button
          onClick={() => onChange(null as unknown as Caregiver)}
          className="text-neutral-500 hover:text-neutral-300 ml-1"
          aria-label="Change caregiver"
        >
          change
        </button>
      </div>
    </div>
  );
}
